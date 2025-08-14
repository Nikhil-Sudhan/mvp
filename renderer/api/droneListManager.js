// Drone List Manager - Central management for drone instances
// Tracks drones added to the map and provides interface for AI agent

class DroneListManager {
    constructor() {
        this.drones = [];
        this.eventListeners = new Map();
        console.log('🚁 DroneListManager initialized');
    }

    // Add a drone to the managed list
    addDrone(droneData) {
        const drone = {
            id: droneData.id || `drone_${Date.now()}`,
            name: droneData.name || `${droneData.type}_${this.drones.length + 1}`,
            type: droneData.type,
            position: droneData.position,
            entity: droneData.entity,
            coordinates: droneData.coordinates,
            status: 'active',
            addedAt: new Date().toISOString()
        };

        this.drones.push(drone);
        console.log(`📍 Added drone to list: ${drone.name} (${drone.type})`);
        
        // Emit drone added event
        this.emit('droneAdded', drone);
        
        return drone;
    }

    // Remove a drone from the list
    removeDrone(droneId) {
        const index = this.drones.findIndex(d => d.id === droneId);
        if (index > -1) {
            const removedDrone = this.drones.splice(index, 1)[0];
            console.log(`🗑️ Removed drone from list: ${removedDrone.name}`);
            
            // Emit drone removed event
            this.emit('droneRemoved', removedDrone);
            
            return removedDrone;
        }
        return null;
    }

    // Get all drones
    getAllDrones() {
        return this.drones.slice(); // Return copy
    }

    // Get active drones only
    getActiveDrones() {
        return this.drones.filter(d => d.status === 'active');
    }

    // Get drone by ID
    getDroneById(droneId) {
        return this.drones.find(d => d.id === droneId);
    }

    // Get drone by name
    getDroneByName(droneName) {
        return this.drones.find(d => d.name === droneName);
    }

    // Update drone status
    updateDroneStatus(droneId, status) {
        const drone = this.getDroneById(droneId);
        if (drone) {
            drone.status = status;
            this.emit('droneStatusUpdated', drone);
            return drone;
        }
        return null;
    }

    // Update drone position
    updateDronePosition(droneId, position, coordinates) {
        const drone = this.getDroneById(droneId);
        if (drone) {
            drone.position = position;
            if (coordinates) {
                drone.coordinates = coordinates;
            }
            this.emit('dronePositionUpdated', drone);
            return drone;
        }
        return null;
    }

    // Get drone names for AI agent selection
    getDroneNames() {
        return this.getActiveDrones().map(d => d.name);
    }

    // Get drone info formatted for AI agent display
    getDronesForDisplay() {
        return this.getActiveDrones().map(d => ({
            name: d.name,
            type: d.type,
            status: d.status,
            coordinates: d.coordinates
        }));
    }

    // Clear all drones
    clearAllDrones() {
        const removedDrones = this.drones.slice();
        this.drones = [];
        console.log(`🧹 Cleared all drones (${removedDrones.length})`);
        
        removedDrones.forEach(drone => {
            this.emit('droneRemoved', drone);
        });
        
        return removedDrones;
    }

    // Event system for notifications
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in drone event listener for ${event}:`, error);
                }
            });
        }
    }

    // Get statistics
    getStats() {
        const totalDrones = this.drones.length;
        const activeDrones = this.getActiveDrones().length;
        const dronesByType = this.drones.reduce((acc, drone) => {
            acc[drone.type] = (acc[drone.type] || 0) + 1;
            return acc;
        }, {});

        return {
            total: totalDrones,
            active: activeDrones,
            byType: dronesByType,
            lastAdded: this.drones.length > 0 ? this.drones[this.drones.length - 1].addedAt : null
        };
    }

    // Export drone data
    exportDroneData() {
        return {
            timestamp: new Date().toISOString(),
            drones: this.drones.map(drone => ({
                id: drone.id,
                name: drone.name,
                type: drone.type,
                coordinates: drone.coordinates,
                status: drone.status,
                addedAt: drone.addedAt
            }))
        };
    }
}

// Create global instance
if (!window.droneListManager) {
    window.droneListManager = new DroneListManager();
}

// Export for module use
window.DroneListManager = DroneListManager;

console.log('✅ DroneListManager loaded and ready');



