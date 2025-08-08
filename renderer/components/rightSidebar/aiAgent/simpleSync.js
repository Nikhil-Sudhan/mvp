// Simple Waypoint Synchronization - Safe and Stable
class SimpleWaypointSync {
    constructor(aiAgentInstance) {
        this.aiAgent = aiAgentInstance;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        
        // Simple sync interval - every 10 seconds
        this.syncInterval = setInterval(() => {
            this.performSimpleSync();
        }, 10000);
        
        console.log('✅ SimpleWaypointSync initialized');
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
            if (!this.aiAgent.waypointStorage) return;
            
            // Load waypoints from file
            const fileWaypoints = await this.aiAgent.waypointStorage.loadWaypoints();
            const currentWaypoints = this.aiAgent.waypoints;
            
            // Simple comparison - if counts don't match, reload from file
            if (fileWaypoints.length !== currentWaypoints.length) {
                console.log('🔄 File system sync: Reloading waypoints from file');
                this.aiAgent.waypoints = fileWaypoints;
                this.aiAgent.updateWaypointsList();
            }
            
        } catch (error) {
            console.error('❌ File system sync failed:', error);
        }
    }

    async syncWithMap() {
        try {
            if (!this.aiAgent.cesiumViewer) return;
            
            const currentWaypoints = this.aiAgent.waypoints;
            const mapEntities = this.aiAgent.cesiumViewer.entities.values;
            
            // Count waypoint entities on map
            const mapWaypointCount = mapEntities.filter(entity => 
                entity.waypointId || entity.id?.includes('waypoint')
            ).length;
            
            // If map count doesn't match waypoints, restore them
            if (mapWaypointCount !== currentWaypoints.length) {
                console.log('🔄 Map sync: Restoring waypoints to map');
                await this.aiAgent.restoreWaypointsToMap();
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
    getStatus() {
        return {
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            totalWaypoints: this.aiAgent.waypoints.length
        };
    }

    // Cleanup
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('🧹 SimpleWaypointSync destroyed');
    }
}

// Export for global access
window.SimpleWaypointSync = SimpleWaypointSync; 