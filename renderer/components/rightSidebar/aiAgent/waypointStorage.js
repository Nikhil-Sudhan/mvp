class WaypointStorage {
    constructor() {
        this.useFileSystem = false;
        this.storageKey = 'avionixis-waypoints';
        
        // Sync properties
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.aiAgent = null;
        this.cesiumViewer = null;
        
        // Waypoint management properties
        this.waypoints = [];
        this.selectedWaypoints = [];
        this.currentPolygon = null;
        
        // Try to initialize Node.js modules for Electron
        this.initFileSystem();
        
        // Start automatic sync every 10 seconds
        this.startAutoSync();
        
        console.log('✅ WaypointStorage initialized with sync');
    }

    // Set references to AI Agent and Cesium viewer for sync
    setReferences(aiAgentInstance, cesiumViewer) {
        this.aiAgent = aiAgentInstance;
        this.cesiumViewer = cesiumViewer;
    }

    // Set current polygon for waypoint creation
    setCurrentPolygon(polygon) {
        this.currentPolygon = polygon;
    }

    // Get waypoints array
    getWaypoints() {
        return this.waypoints;
    }

    // Set waypoints array
    setWaypoints(waypoints) {
        this.waypoints = waypoints;
    }

    // Get selected waypoints
    getSelectedWaypoints() {
        return this.selectedWaypoints;
    }

    // Set selected waypoints
    setSelectedWaypoints(selectedWaypoints) {
        this.selectedWaypoints = selectedWaypoints;
    }

    // Add waypoint to array
    addWaypoint(waypoint) {
        this.waypoints.push(waypoint);
    }

    // Remove waypoint by ID
    removeWaypoint(waypointId) {
        this.waypoints = this.waypoints.filter(w => w.id !== waypointId);
        this.selectedWaypoints = this.selectedWaypoints.filter(id => id !== waypointId);
    }

    // Find waypoint by ID
    findWaypoint(waypointId) {
        return this.waypoints.find(w => w.id === waypointId);
    }

    // Find waypoint by name
    findWaypointByName(name) {
        return this.waypoints.find(w => w.name === name);
    }

    // Toggle waypoint selection
    toggleWaypointSelection(waypointId) {
        const index = this.selectedWaypoints.indexOf(waypointId);
        if (index > -1) {
            this.selectedWaypoints.splice(index, 1);
        } else {
            this.selectedWaypoints.push(waypointId);
        }
        return this.selectedWaypoints;
    }

    // Clear selected waypoints
    clearSelectedWaypoints() {
        this.selectedWaypoints = [];
    }

    // Get selected waypoint objects
    getSelectedWaypointObjects() {
        return this.waypoints.filter(w => this.selectedWaypoints.includes(w.id));
    }

    startAutoSync() {
        this.syncInterval = setInterval(() => {
            this.performSimpleSync();
        }, 10000);
    }

    async performSimpleSync() {
        if (this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;
        
        try {
            // Simple file system sync
            await this.syncWithFileSystem();
            
            // Simple map sync
            await this.syncWithMap();
            
            this.lastSyncTime = new Date();
            
        } catch (error) {
            console.error('❌ Simple sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncWithFileSystem() {
        try {
            if (!this.aiAgent) return;
            
            // Load waypoints from file
            const fileWaypoints = await this.loadWaypoints();
            const currentWaypoints = this.waypoints || [];
            
            // Simple comparison - if counts don't match, reload from file
            if (fileWaypoints.length !== currentWaypoints.length) {
                console.log('🔄 File system sync: Reloading waypoints from file');
                this.waypoints = fileWaypoints;
                if (this.aiAgent.updateWaypointsList) {
                    this.aiAgent.updateWaypointsList();
                }
            }
            
        } catch (error) {
            console.error('❌ File system sync failed:', error);
        }
    }

    async syncWithMap() {
        try {
            if (!this.aiAgent || !this.cesiumViewer) return;
            
            const currentWaypoints = this.waypoints || [];
            const mapEntities = this.cesiumViewer.entities.values;
            
            // Count waypoint entities on map
            const mapWaypointCount = mapEntities.filter(entity => 
                entity.waypointId || entity.id?.includes('waypoint')
            ).length;
            
            // If map count doesn't match waypoints, restore them
            if (mapWaypointCount !== currentWaypoints.length) {
                console.log('🔄 Map sync: Restoring waypoints to map');
                if (this.aiAgent.restoreWaypointsToMap) {
                    await this.aiAgent.restoreWaypointsToMap();
                }
            }
            
        } catch (error) {
            console.error('❌ Map sync failed:', error);
        }
    }

    // Manual sync method
    async forceSync() {
        console.log('🔄 Force sync requested');
        await this.performSimpleSync();
    }

    // Get sync status
    getSyncStatus() {
        return {
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            totalWaypoints: this.waypoints?.length || 0
        };
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
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            const waypoints = saved ? JSON.parse(saved) : [];
            return waypoints;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return [];
        }
    }

    saveToLocalStorage(waypoints) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(waypoints));
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
            this.waypoints = [];
            this.selectedWaypoints = [];
            return true;
        } catch (error) {
            console.error('Failed to clear waypoints:', error);
            return false;
        }
    }

    // Create and save new waypoint
    async createWaypoint(name, polygon) {
        if (!name || !polygon) {
            throw new Error('Name and polygon are required');
        }

        // Check if name already exists
        const existingWaypoint = this.waypoints.find(w => w.name === name);
        if (existingWaypoint) {
            throw new Error(`A waypoint named "${name}" already exists`);
        }

        try {
            // Convert positions to lat/lon coordinates
            const coordinates = polygon.positions.map(pos => {
                const cartographic = Cesium.Cartographic.fromCartesian(pos);
                return {
                    lat: Cesium.Math.toDegrees(cartographic.latitude),
                    lon: Cesium.Math.toDegrees(cartographic.longitude),
                    alt: cartographic.height || 100 // Default altitude
                };
            });

            // Create waypoint object
            const waypoint = {
                id: Date.now().toString(),
                name: name,
                type: polygon.type,
                coordinates: coordinates,
                created: new Date().toISOString(),
                entityId: polygon.entity.id,
                description: `${polygon.type} waypoint created via drawing tools`,
                tags: [polygon.type, 'waypoint', 'drawn'],
                metadata: {
                    pointCount: coordinates.length,
                    area: (window.mapControlsManager?.drawingTools?.calculateArea?.(coordinates)) || 0,
                    perimeter: (window.mapControlsManager?.drawingTools?.calculatePerimeter?.(coordinates)) || 0
                }
            };

            // Add to waypoints array
            this.waypoints.push(waypoint);
            
            // Save to storage
            await this.saveWaypoints(this.waypoints);
            
            // Save individual waypoint file
            await this.saveIndividualWaypointFile(waypoint);
            
            return waypoint;
            
        } catch (error) {
            console.error('Failed to create waypoint:', error);
            throw error;
        }
    }

    // Update waypoint name
    async updateWaypointName(waypointId, newName) {
        const waypoint = this.waypoints.find(w => w.id === waypointId);
        if (!waypoint) {
            throw new Error('Waypoint not found');
        }

        const oldName = waypoint.name;
        waypoint.name = newName;
        
        // Save to storage
        await this.saveWaypoints(this.waypoints);
        
        // Update individual waypoint file
        await this.updateIndividualWaypointFile(waypoint, oldName);
        
        return waypoint;
    }

    // Delete waypoint
    async deleteWaypoint(waypointId) {
        const waypoint = this.waypoints.find(w => w.id === waypointId);
        if (!waypoint) {
            throw new Error('Waypoint not found');
        }

        const waypointName = waypoint.name;
        
        // Remove from array
        this.removeWaypoint(waypointId);
        
        // Save to storage
        await this.saveWaypoints(this.waypoints);
        
        // Delete individual waypoint file
        await this.deleteIndividualWaypointFile(waypointName);
        
        return waypointName;
    }

    // Get waypoint data for API context
    getWaypointDataForContext(contextWaypointNames) {
        const waypointData = [];
        
        contextWaypointNames.forEach(waypointName => {
            const waypoint = this.waypoints.find(w => w.name === waypointName);
            if (waypoint) {
                const apiWaypointData = {
                    id: waypoint.id,
                    name: waypoint.name,
                    type: waypoint.type,
                    coordinates: waypoint.coordinates,
                    description: waypoint.description,
                    tags: waypoint.tags,
                    metadata: waypoint.metadata
                };
                waypointData.push(apiWaypointData);
            }
        });
        
        return waypointData;
    }

    // Convert waypoints to track mission format
    convertToTrackMissionFormat(waypoints = null) {
        const targetWaypoints = waypoints || this.waypoints;
        
        return targetWaypoints.flatMap(waypoint => 
            waypoint.coordinates.map((coord, index) => ({
                id: `${waypoint.id}_${index}`,
                name: `${waypoint.name}_${index + 1}`,
                latitude: coord.lat,
                longitude: coord.lon,
                altitude: coord.alt,
                description: `Point ${index + 1} of ${waypoint.name}`
            }))
        );
    }

    // Convert selected waypoints to track mission format
    convertSelectedToTrackMissionFormat() {
        const selectedWaypoints = this.waypoints.filter(w => 
            this.selectedWaypoints.includes(w.id)
        );
        return this.convertToTrackMissionFormat(selectedWaypoints);
    }

    // Send waypoints to backend
    async sendWaypointsToBackend(missionName) {
        if (this.selectedWaypoints.length === 0) {
            throw new Error('No waypoints selected');
        }

        const selectedWaypoints = this.waypoints.filter(w => 
            this.selectedWaypoints.includes(w.id)
        );

        // Convert to backend format
        const waypointsData = selectedWaypoints.flatMap(waypoint => 
            waypoint.coordinates.map(coord => ({
                lat: coord.lat,
                lon: coord.lon,
                alt: coord.alt
            }))
        );

        if (!window.sendWaypointsToBackend) {
            throw new Error('sendWaypointsToBackend function not available');
        }

        return await window.sendWaypointsToBackend(
            missionName,
            waypointsData,
            [] // contextWaypoints parameter
        );
    }

    // Restore waypoints to the map
    async restoreWaypointsToMap() {
        try {
            // Wait for Cesium viewer to be available
            if (!window.viewer && !window.cesiumViewer) {
                console.log('Cesium viewer not available yet, retrying in 1 second...');
                setTimeout(() => this.restoreWaypointsToMap(), 1000);
                return;
            }

            const viewer = window.viewer || window.cesiumViewer;
            if (!viewer) {
                console.warn('Cesium viewer not found, cannot restore waypoints to map');
                return;
            }

            console.log(`Restoring ${this.waypoints.length} waypoints to map`);
            
            for (const waypoint of this.waypoints) {
                try {
                    // Convert coordinates back to Cartesian3
                    const positions = waypoint.coordinates.map(coord => 
                        Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.alt || 100)
                    );

                    // Create entity based on waypoint type
                    let entity;
                    if (waypoint.type === 'circle') {
                        entity = viewer.entities.add({
                            id: waypoint.entityId,
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(positions),
                                material: Cesium.Color.CYAN.withAlpha(0.3),
                                outline: true,
                                outlineColor: Cesium.Color.CYAN,
                                outlineWidth: 2,
                                height: 0,
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                                extrudedHeight: 0
                            }
                        });
                    } else {
                        // Default polygon rendering for squares and polygons
                        entity = viewer.entities.add({
                            id: waypoint.entityId,
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(positions),
                                material: Cesium.Color.CYAN.withAlpha(0.3),
                                outline: true,
                                outlineColor: Cesium.Color.CYAN,
                                outlineWidth: 2,
                                height: 0,
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                                extrudedHeight: 0
                            }
                        });
                    }
                    
                    // Add boundary polyline for restored shapes
                    try {
                        const boundaryPositions = positions.concat(positions[0]);
                        const boundaryId = `boundary-of-${waypoint.entityId}`;
                        viewer.entities.add({
                            id: boundaryId,
                            polyline: {
                                positions: boundaryPositions,
                                width: 5,
                                material: new Cesium.PolylineOutlineMaterialProperty({
                                    color: Cesium.Color.YELLOW,
                                    outlineColor: Cesium.Color.BLACK,
                                    outlineWidth: 2
                                }),
                                clampToGround: true
                            }
                        });
                    } catch (_) {}

                    console.log(`Restored waypoint "${waypoint.name}" to map`);
                } catch (error) {
                    console.error(`Failed to restore waypoint "${waypoint.name}" to map:`, error);
                }
            }

            if (this.waypoints.length > 0) {
                console.log(`✅ Restored ${this.waypoints.length} waypoints to the map`);
            }
        } catch (error) {
            console.error('Failed to restore waypoints to map:', error);
        }
    }

    // Save individual waypoint JSON file
    async saveIndividualWaypointFile(waypoint) {
        try {
            // Check if file system is available
            if (!this.useFileSystem) {
                console.log('File system not available, skipping individual waypoint file save');
                return;
            }

            // Sanitize filename (remove invalid characters)
            const sanitizedName = waypoint.name.replace(/[<>:"/\\|?*]/g, '_');
            const fileName = `${sanitizedName}.json`;
            const filePath = require('path').join(process.cwd(), 'waypoints', fileName);
            
            // Create waypoint data for individual file
            const waypointData = {
                version: '1.0',
                created: waypoint.created,
                waypoint: waypoint,
                metadata: {
                    savedAt: new Date().toISOString(),
                    source: 'Sky Loom Drawing Tools',
                    format: 'individual'
                }
            };

            // Write the file
            require('fs').writeFileSync(filePath, JSON.stringify(waypointData, null, 2), 'utf8');
            console.log(`Individual waypoint file saved: ${filePath}`);
            
        } catch (error) {
            console.error('Failed to save individual waypoint file:', error);
        }
    }

    // Update individual waypoint file when name changes
    async updateIndividualWaypointFile(waypoint, oldName) {
        try {
            // Check if file system is available
            if (!this.useFileSystem) {
                console.log('File system not available, skipping individual waypoint file update');
                return;
            }

            // Delete old file if name changed
            if (oldName && oldName !== waypoint.name) {
                const oldFileName = `${oldName.replace(/[<>:"/\\|?*]/g, '_')}.json`;
                const oldFilePath = require('path').join(process.cwd(), 'waypoints', oldFileName);
                
                try {
                    if (require('fs').existsSync(oldFilePath)) {
                        require('fs').unlinkSync(oldFilePath);
                        console.log(`Deleted old waypoint file: ${oldFilePath}`);
                    }
                } catch (error) {
                    console.warn('Failed to delete old waypoint file:', error);
                }
            }

            // Create new file with updated name
            const sanitizedName = waypoint.name.replace(/[<>:"/\\|?*]/g, '_');
            const fileName = `${sanitizedName}.json`;
            const filePath = require('path').join(process.cwd(), 'waypoints', fileName);
            
            // Create waypoint data for individual file
            const waypointData = {
                version: '1.0',
                created: waypoint.created,
                waypoint: waypoint,
                metadata: {
                    savedAt: new Date().toISOString(),
                    source: 'Sky Loom Drawing Tools',
                    format: 'individual',
                    lastModified: new Date().toISOString()
                }
            };

            // Write the updated file
            require('fs').writeFileSync(filePath, JSON.stringify(waypointData, null, 2), 'utf8');
            console.log(`Updated individual waypoint file: ${filePath}`);
            
        } catch (error) {
            console.error('Failed to update individual waypoint file:', error);
        }
    }

    // Delete individual waypoint file
    async deleteIndividualWaypointFile(waypointName) {
        try {
            // Check if file system is available
            if (!this.useFileSystem) {
                console.log('File system not available, skipping individual waypoint file deletion');
                return;
            }

            // Sanitize filename
            const sanitizedName = waypointName.replace(/[<>:"/\\|?*]/g, '_');
            const fileName = `${sanitizedName}.json`;
            const filePath = require('path').join(process.cwd(), 'waypoints', fileName);
            
            // Delete the file
            if (require('fs').existsSync(filePath)) {
                require('fs').unlinkSync(filePath);
                console.log(`Deleted individual waypoint file: ${filePath}`);
            } else {
                console.warn(`Waypoint file not found for deletion: ${filePath}`);
            }
            
        } catch (error) {
            console.error('Failed to delete individual waypoint file:', error);
        }
    }

    // Sync waypoints with individual JSON files
    async syncWithIndividualFiles() {
        try {
            // Check if file system is available
            if (!this.useFileSystem) {
                console.log('File system not available, skipping individual file sync');
                return;
            }

            const fs = require('fs');
            const path = require('path');
            const waypointsDir = path.join(process.cwd(), 'waypoints');
            
            // Check if waypoints directory exists
            if (!fs.existsSync(waypointsDir)) {
                console.log('Waypoints directory not found, skipping sync');
                return;
            }

            // Read all JSON files in waypoints directory
            const files = fs.readdirSync(waypointsDir).filter(file => file.endsWith('.json'));
            console.log(`Found ${files.length} individual waypoint files`);

            // Check for orphaned files (files that don't correspond to loaded waypoints)
            const loadedWaypointNames = this.waypoints.map(w => w.name);
            let orphanedFiles = [];

            for (const file of files) {
                const waypointName = file.replace('.json', '');
                if (!loadedWaypointNames.includes(waypointName)) {
                    orphanedFiles.push(file);
                }
            }

            // Remove orphaned files
            for (const orphanedFile of orphanedFiles) {
                const filePath = path.join(waypointsDir, orphanedFile);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Removed orphaned waypoint file: ${orphanedFile}`);
                } catch (error) {
                    console.warn(`Failed to remove orphaned file ${orphanedFile}:`, error);
                }
            }

            if (orphanedFiles.length > 0) {
                console.log(`Cleaned up ${orphanedFiles.length} orphaned waypoint files`);
            }

        } catch (error) {
            console.error('Failed to sync with individual files:', error);
        }
    }

    // Cleanup sync interval
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('🧹 WaypointStorage destroyed');
    }
}

// Export for global access
window.WaypointStorage = WaypointStorage; 