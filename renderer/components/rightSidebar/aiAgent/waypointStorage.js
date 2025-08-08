class WaypointStorage {
    constructor() {
        this.useFileSystem = false;
        this.storageKey = 'avionixis-waypoints';
        
        // Try to initialize Node.js modules for Electron
        this.initFileSystem();
    }

    initFileSystem() {
        try {
            // Try to require Node.js modules
            this.fs = window.require ? window.require('fs') : require('fs');
            this.path = window.require ? window.require('path') : require('path');
            this.os = window.require ? window.require('os') : require('os');
            
            if (this.fs && this.path && this.os) {
                this.useFileSystem = true;
                this.setupPaths();
                // File system storage initialized
            }
        } catch (error) {
            console.warn('Node.js modules not available, using localStorage:', error);
            this.useFileSystem = false;
        }
    }

    setupPaths() {
        if (!this.useFileSystem) return;

        try {
            this.basePath = this.path.join(this.os.homedir(), '.avionixis');
            this.waypointsPath = this.path.join(this.basePath, 'waypoints');
            this.waypointsFile = this.path.join(this.waypointsPath, 'waypoints.json');
            
            // Create directories if they don't exist
            this.ensureDirectory(this.basePath);
            this.ensureDirectory(this.waypointsPath);
            
            // Storage paths initialized
        } catch (error) {
            console.error('Failed to setup file system paths:', error);
            this.useFileSystem = false;
        }
    }

    ensureDirectory(dirPath) {
        try {
            if (!this.fs.existsSync(dirPath)) {
                this.fs.mkdirSync(dirPath, { recursive: true });
            }
        } catch (error) {
            console.error(`Failed to create directory ${dirPath}:`, error);
            throw error;
        }
    }

    async loadWaypoints() {
        try {
            if (this.useFileSystem) {
                const waypoints = await this.loadFromFile();
                
                // Emit file change event for synchronization (disabled for now)
                // this.emitFileChangeEvent('waypointsLoaded', { count: waypoints.length });
                
                return waypoints;
            } else {
                return this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Failed to load waypoints:', error);
            // Always fallback to localStorage
            return this.loadFromLocalStorage();
        }
    }

    async saveWaypoints(waypoints) {
        try {
            // Always save to localStorage as backup
            this.saveToLocalStorage(waypoints);
            
            if (this.useFileSystem) {
                await this.saveToFile(waypoints);
                
                // Emit file change event for synchronization (disabled for now)
                // this.emitFileChangeEvent('waypointsSaved', { count: waypoints.length });
            }
            
            return true;
        } catch (error) {
            console.error('Failed to save waypoints:', error);
            // At least localStorage should work
            return this.saveToLocalStorage(waypoints);
        }
    }

    async loadFromFile() {
        if (!this.fs.existsSync(this.waypointsFile)) {
            return [];
        }

        const data = this.fs.readFileSync(this.waypointsFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Validate data structure
        if (parsed.waypoints && Array.isArray(parsed.waypoints)) {
            // Loaded waypoints from file
            return parsed.waypoints;
        }
        
        return [];
    }

    async saveToFile(waypoints) {
        const data = {
            version: '1.0',
            created: new Date().toISOString(),
            waypoints: waypoints,
            metadata: {
                totalWaypoints: waypoints.length,
                types: this.getWaypointTypes(waypoints)
            }
        };

        this.fs.writeFileSync(this.waypointsFile, JSON.stringify(data, null, 2), 'utf8');
        // Saved waypoints to file
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            const waypoints = saved ? JSON.parse(saved) : [];
            // Loaded waypoints from localStorage
            return waypoints;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }

    saveToLocalStorage(waypoints) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(waypoints));
            // Saved waypoints to localStorage
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getWaypointTypes(waypoints) {
        const types = {};
        waypoints.forEach(waypoint => {
            types[waypoint.type] = (types[waypoint.type] || 0) + 1;
        });
        return types;
    }

    // Search functionality
    async searchWaypoints(query) {
        try {
            const waypoints = await this.loadWaypoints();
            const lowerQuery = query.toLowerCase();

            return waypoints.filter(waypoint => {
                return (
                    waypoint.name.toLowerCase().includes(lowerQuery) ||
                    waypoint.type.toLowerCase().includes(lowerQuery) ||
                    (waypoint.description && waypoint.description.toLowerCase().includes(lowerQuery))
                );
            });
        } catch (error) {
            console.error('Failed to search waypoints:', error);
            return [];
        }
    }

    // Convert waypoints to backend format
    convertToBackendFormat(waypoints) {
        return waypoints.flatMap(waypoint => 
            waypoint.coordinates.map(coord => ({
                lat: coord.lat,
                lon: coord.lon,
                alt: coord.alt
            }))
        );
    }

    // Convert from backend format to internal format
    convertFromBackendFormat(backendWaypoints, waypointName) {
        return backendWaypoints.map((coord, index) => ({
            id: `${Date.now()}_${index}`,
            name: `${waypointName}_${index + 1}`,
            type: 'point',
            coordinates: [{
                lat: coord.lat,
                lon: coord.lon,
                alt: coord.alt
            }],
            created: new Date().toISOString(),
            description: `Point ${index + 1} of ${waypointName}`,
            tags: ['point', 'waypoint', 'imported'],
            metadata: {
                pointCount: 1,
                area: 0,
                perimeter: 0
            }
        }));
    }

    // Export/Import functionality
    async exportWaypoints(filePath) {
        try {
            if (!this.useFileSystem) {
                throw new Error('File system not available');
            }

            const waypoints = await this.loadWaypoints();
            const exportData = {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                source: 'Avionixis',
                waypoints: waypoints
            };

            this.fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
            // Exported waypoints
            return true;
        } catch (error) {
            console.error('Failed to export waypoints:', error);
            return false;
        }
    }

    async importWaypoints(filePath, merge = false) {
        try {
            if (!this.useFileSystem) {
                throw new Error('File system not available');
            }

            if (!this.fs.existsSync(filePath)) {
                throw new Error('Import file does not exist');
            }

            const data = this.fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);
            
            if (!parsed.waypoints || !Array.isArray(parsed.waypoints)) {
                throw new Error('Invalid waypoint data format');
            }

            let waypoints = parsed.waypoints;

            if (merge) {
                const existing = await this.loadWaypoints();
                // Merge waypoints, avoiding duplicates by name
                const existingNames = existing.map(w => w.name);
                const newWaypoints = waypoints.filter(w => !existingNames.includes(w.name));
                waypoints = [...existing, ...newWaypoints];
            }

            await this.saveWaypoints(waypoints);
            // Imported waypoints
            return { 
                success: true, 
                imported: parsed.waypoints.length, 
                total: waypoints.length 
            };
        } catch (error) {
            console.error('Failed to import waypoints:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // Statistics
    async getStatistics() {
        try {
            const waypoints = await this.loadWaypoints();
            const types = this.getWaypointTypes(waypoints);
            
            return {
                total: waypoints.length,
                types: types,
                storageType: this.useFileSystem ? 'file' : 'localStorage',
                created: waypoints.length > 0 ? waypoints.reduce((earliest, w) => {
                    return new Date(w.created) < new Date(earliest) ? w.created : earliest;
                }, waypoints[0].created) : null,
                lastUpdated: waypoints.length > 0 ? waypoints.reduce((latest, w) => {
                    return new Date(w.created) > new Date(latest) ? w.created : latest;
                }, waypoints[0].created) : null
            };
        } catch (error) {
            console.error('Failed to get statistics:', error);
            return { 
                total: 0, 
                types: {}, 
                storageType: 'unknown',
                created: null, 
                lastUpdated: null 
            };
        }
    }

    // Clear all waypoints
    async clearAll() {
        try {
            await this.saveWaypoints([]);
            // Cleared all waypoints
            return true;
        } catch (error) {
            console.error('Failed to clear waypoints:', error);
            return false;
        }
    }

    // Emit file change events for synchronization (disabled for now)
    emitFileChangeEvent(eventType, fileData) {
        // Disabled to prevent crashes
        console.log(`📁 File event emission disabled: ${eventType}`);
    }
}

// Export for global access
window.WaypointStorage = WaypointStorage; 