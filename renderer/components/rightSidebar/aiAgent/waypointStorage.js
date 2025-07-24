// Waypoint Storage Manager - JSON File System
class WaypointStorage {
    constructor() {
        this.waypointsDir = 'waypoints';
        this.waypointsFile = 'waypoints.json';
        this.backupDir = 'waypoints/backups';
        this.useFileSystem = true;
        
        // Initialize Node.js modules safely for Electron renderer
        try {
            this.fs = window.require ? window.require('fs') : require('fs');
            this.path = window.require ? window.require('path') : require('path');
            this.os = window.require ? window.require('os') : require('os');
        } catch (error) {
            console.warn('Node.js modules not available, falling back to localStorage:', error);
            this.useFileSystem = false;
        }
        
        if (this.useFileSystem) {
            // Set up storage paths
            this.basePath = this.path.join(this.os.homedir(), '.skyloom');
            this.waypointsPath = this.path.join(this.basePath, this.waypointsDir);
            this.waypointsFilePath = this.path.join(this.waypointsPath, this.waypointsFile);
            this.backupPath = this.path.join(this.basePath, this.backupDir);
        }
        
        this.init();
    }

    async init() {
        try {
            if (!this.useFileSystem) {
                console.log('WaypointStorage initialized with localStorage fallback');
                return;
            }

            // Create directories if they don't exist
            await this.ensureDirectoryExists(this.basePath);
            await this.ensureDirectoryExists(this.waypointsPath);
            await this.ensureDirectoryExists(this.backupPath);
            
            // Initialize waypoints file if it doesn't exist
            if (!this.fs.existsSync(this.waypointsFilePath)) {
                await this.saveWaypoints([]);
            }
            
            console.log('WaypointStorage initialized successfully with file system');
        } catch (error) {
            console.error('Failed to initialize WaypointStorage file system:', error);
            // Fallback to localStorage if file system fails
            this.useFileSystem = false;
            console.log('Falling back to localStorage for waypoint storage');
        }
    }

    async ensureDirectoryExists(dirPath) {
        try {
            if (!this.useFileSystem) return;
            
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
            if (!this.useFileSystem) {
                return this.loadFromLocalStorage();
            }

            if (!this.fs.existsSync(this.waypointsFilePath)) {
                return [];
            }

            const data = this.fs.readFileSync(this.waypointsFilePath, 'utf8');
            const parsed = JSON.parse(data);
            
            // Validate data structure
            if (!Array.isArray(parsed.waypoints)) {
                console.warn('Invalid waypoints data structure, returning empty array');
                return [];
            }

            console.log(`Loaded ${parsed.waypoints.length} waypoints from JSON file`);
            return parsed.waypoints;
        } catch (error) {
            console.error('Failed to load waypoints from file:', error);
            
            // Try to load backup
            try {
                return await this.loadFromBackup();
            } catch (backupError) {
                console.error('Failed to load from backup:', backupError);
                return this.loadFromLocalStorage();
            }
        }
    }

    async saveWaypoints(waypoints) {
        try {
            // Always save to localStorage as backup
            this.saveToLocalStorage(waypoints);

            if (!this.useFileSystem) {
                return true;
            }

            // Create backup before saving
            await this.createBackup();

            const data = {
                version: '1.0',
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                waypoints: waypoints,
                metadata: {
                    totalWaypoints: waypoints.length,
                    types: this.getWaypointTypes(waypoints)
                }
            };

            this.fs.writeFileSync(this.waypointsFilePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Saved ${waypoints.length} waypoints to JSON file`);
            
            // Also save individual waypoint files for @ search
            await this.saveIndividualWaypoints(waypoints);
            
            return true;
        } catch (error) {
            console.error('Failed to save waypoints to file:', error);
            
            // Fallback already handled above
            return true;
        }
    }

    async saveIndividualWaypoints(waypoints) {
        try {
            if (!this.useFileSystem) return;

            const individualDir = this.path.join(this.waypointsPath, 'individual');
            await this.ensureDirectoryExists(individualDir);

            // Clear existing individual files
            if (this.fs.existsSync(individualDir)) {
                const existingFiles = this.fs.readdirSync(individualDir);
                existingFiles.forEach(file => {
                    if (file.endsWith('.json')) {
                        this.fs.unlinkSync(this.path.join(individualDir, file));
                    }
                });
            }

            // Save each waypoint as individual file
            for (const waypoint of waypoints) {
                const filename = `${this.sanitizeFilename(waypoint.name)}.json`;
                const filepath = this.path.join(individualDir, filename);
                
                const waypointData = {
                    ...waypoint,
                    searchTerms: this.generateSearchTerms(waypoint),
                    savedAt: new Date().toISOString()
                };

                this.fs.writeFileSync(filepath, JSON.stringify(waypointData, null, 2), 'utf8');
            }

            console.log(`Saved ${waypoints.length} individual waypoint files`);
        } catch (error) {
            console.error('Failed to save individual waypoint files:', error);
        }
    }

    async searchWaypoints(query) {
        try {
            const waypoints = await this.loadWaypoints();
            const lowerQuery = query.toLowerCase();

            return waypoints.filter(waypoint => {
                return (
                    waypoint.name.toLowerCase().includes(lowerQuery) ||
                    (waypoint.description && waypoint.description.toLowerCase().includes(lowerQuery)) ||
                    waypoint.type.toLowerCase().includes(lowerQuery) ||
                    (waypoint.tags && waypoint.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
                );
            });
        } catch (error) {
            console.error('Failed to search waypoints:', error);
            return [];
        }
    }

    async createBackup() {
        try {
            if (!this.useFileSystem || !this.fs.existsSync(this.waypointsFilePath)) {
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `waypoints-backup-${timestamp}.json`;
            const backupFilePath = this.path.join(this.backupPath, backupFilename);

            this.fs.copyFileSync(this.waypointsFilePath, backupFilePath);
            
            // Keep only last 10 backups
            await this.cleanupOldBackups();
            
            console.log(`Created backup: ${backupFilename}`);
        } catch (error) {
            console.error('Failed to create backup:', error);
        }
    }

    async cleanupOldBackups() {
        try {
            if (!this.useFileSystem || !this.fs.existsSync(this.backupPath)) return;

            const backupFiles = this.fs.readdirSync(this.backupPath)
                .filter(file => file.startsWith('waypoints-backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: this.path.join(this.backupPath, file),
                    stat: this.fs.statSync(this.path.join(this.backupPath, file))
                }))
                .sort((a, b) => b.stat.mtime - a.stat.mtime);

            // Keep only the 10 most recent backups
            if (backupFiles.length > 10) {
                const filesToDelete = backupFiles.slice(10);
                filesToDelete.forEach(file => {
                    this.fs.unlinkSync(file.path);
                    console.log(`Deleted old backup: ${file.name}`);
                });
            }
        } catch (error) {
            console.error('Failed to cleanup old backups:', error);
        }
    }

    async loadFromBackup() {
        try {
            if (!this.useFileSystem || !this.fs.existsSync(this.backupPath)) {
                throw new Error('No backup directory found');
            }

            const backupFiles = this.fs.readdirSync(this.backupPath)
                .filter(file => file.startsWith('waypoints-backup-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: this.path.join(this.backupPath, file),
                    stat: this.fs.statSync(this.path.join(this.backupPath, file))
                }))
                .sort((a, b) => b.stat.mtime - a.stat.mtime);

            if (backupFiles.length === 0) {
                throw new Error('No backup files found');
            }

            const latestBackup = backupFiles[0];
            const data = this.fs.readFileSync(latestBackup.path, 'utf8');
            const parsed = JSON.parse(data);

            console.log(`Loaded waypoints from backup: ${latestBackup.name}`);
            return parsed.waypoints || [];
        } catch (error) {
            console.error('Failed to load from backup:', error);
            throw error;
        }
    }

    // Fallback to localStorage methods
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('skyloom-waypoints');
            const waypoints = saved ? JSON.parse(saved) : [];
            console.log(`Loaded ${waypoints.length} waypoints from localStorage (fallback)`);
            return waypoints;
        } catch (error) {
            console.error('Error loading waypoints from localStorage:', error);
            return [];
        }
    }

    saveToLocalStorage(waypoints) {
        try {
            localStorage.setItem('skyloom-waypoints', JSON.stringify(waypoints));
            console.log(`Saved ${waypoints.length} waypoints to localStorage (fallback)`);
            return true;
        } catch (error) {
            console.error('Error saving waypoints to localStorage:', error);
            return false;
        }
    }

    // Helper methods
    sanitizeFilename(name) {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    generateSearchTerms(waypoint) {
        const terms = [
            waypoint.name,
            waypoint.type,
            waypoint.description || '',
            ...(waypoint.tags || [])
        ];

        return terms.filter(term => term && term.length > 0);
    }

    getWaypointTypes(waypoints) {
        const types = waypoints.reduce((acc, waypoint) => {
            acc[waypoint.type] = (acc[waypoint.type] || 0) + 1;
            return acc;
        }, {});

        return types;
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
                source: 'Sky Loom',
                waypoints: waypoints
            };

            this.fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
            console.log(`Exported ${waypoints.length} waypoints to ${filePath}`);
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
            console.log(`Imported ${parsed.waypoints.length} waypoints from ${filePath}`);
            return { success: true, imported: parsed.waypoints.length, total: waypoints.length };
        } catch (error) {
            console.error('Failed to import waypoints:', error);
            return { success: false, error: error.message };
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
                created: waypoints.length > 0 ? waypoints.reduce((earliest, w) => {
                    return new Date(w.created) < new Date(earliest) ? w.created : earliest;
                }, waypoints[0].created) : null,
                lastUpdated: waypoints.length > 0 ? waypoints.reduce((latest, w) => {
                    return new Date(w.created) > new Date(latest) ? w.created : latest;
                }, waypoints[0].created) : null
            };
        } catch (error) {
            console.error('Failed to get statistics:', error);
            return { total: 0, types: {}, created: null, lastUpdated: null };
        }
    }
}

// Export for global access
window.WaypointStorage = WaypointStorage; 