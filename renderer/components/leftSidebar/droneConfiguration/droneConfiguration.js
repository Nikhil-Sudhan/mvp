// Drone configuration constants
const HOME_LOCATION = {
    latitude: 9.6212,  // San Francisco coordinates as example
    longitude: 77.7243,
    altitude: 50 // meters above ground
};

const DRONE_MODELS = {
    'hovermax': {
        ionAssetId: 3336172,
        scale: 1.0,
        minimumPixelSize: 128
    },
    'phantom-x2': {
        ionAssetId: 3336172, // Same glTF asset for both entries
        scale: 0.8,
        minimumPixelSize: 128
    }
};

// Initialize immediately to ensure event listeners are attached
let droneConfigManager;

class DroneConfigurationManager {
    constructor() {
        // Initializing DroneConfigurationManager
        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        this.addDroneBtn = document.getElementById('addDroneBtn');
        this.droneDropdown = document.getElementById('droneDropdown');
        this.droneOptions = document.querySelectorAll('.drone-option');
        
        // UI Elements initialized
    }

    bindEvents() {
        if (!this.addDroneBtn) {
            console.error("Add Drone button not found!");
            return;
        }

        // Toggle dropdown
        this.addDroneBtn.addEventListener('click', (e) => {
            // Add Drone button clicked
            e.stopPropagation();
            this.droneDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.add-drone-container')) {
                this.droneDropdown.classList.add('hidden');
            }
        });

        // Handle drone selection
        if (this.droneOptions && this.droneOptions.length > 0) {
            this.droneOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Drone option clicked
                    this.handleDroneSelection(option);
                });
            });
        } else {
            console.error("No drone options found!");
        }
    }

    async handleDroneSelection(option) {
        const droneType = option.dataset.drone;
        // Selected drone
        this.droneDropdown.classList.add('hidden');
        
        try {
            await this.addDroneToMap(droneType);
            this.showNotification(`Added ${droneType} drone to map`, 'success');
        } catch (error) {
            console.error('Failed to add drone to map:', error);
            this.showNotification(`Failed to add drone: ${error.message}`, 'error');
        }
    }

    // Very simple hardcoded positions: Hovermax at HOME, Phantom X2 ~50m east
    getHardcodedPosition(droneType) {
        const baseLat = HOME_LOCATION.latitude;
        const baseLon = HOME_LOCATION.longitude;
        const alt = 0; // use ground clamping for precise anchoring
        
        if (droneType === 'phantom-x2') {
            // ~50 meters east at ~9.58° latitude (1° lon ≈ 109.7 km)
            const lonOffset = 0.000456; // ~50m
            return {
                position: Cesium.Cartesian3.fromDegrees(baseLon + lonOffset, baseLat, alt),
                lat: baseLat,
                lon: baseLon + lonOffset,
                alt,
            };
        }
        
        // Default: hovermax at home
        return {
            position: Cesium.Cartesian3.fromDegrees(baseLon, baseLat, alt),
            lat: baseLat,
            lon: baseLon,
            alt,
        };
    }

    async addDroneToMap(droneType) {
        const modelConfig = DRONE_MODELS[droneType];
        if (!modelConfig) {
            throw new Error(`Unknown drone type: ${droneType}`);
        }
        
        if (!window.viewer) {
            throw new Error("Cesium viewer not initialized");
        }
        
        // Hardcoded positions only
        const { position, lat, lon, alt } = this.getHardcodedPosition(droneType);

        try {
            // Load Ion resource for glTF model entity
            const resource = await Cesium.IonResource.fromAssetId(modelConfig.ionAssetId);

            // Add entity-based glTF model at the home location
            const entity = window.viewer.entities.add({
                name: `${droneType} drone`,
                position: position,
                model: {
                    uri: resource,
                    scale: modelConfig.scale,
                    minimumPixelSize: 0,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                }
            });

            // Add drone to the drone list manager
            if (window.droneListManager) {
                const droneData = {
                    name: `${droneType}_${Date.now()}`,
                    type: droneType,
                    position: position,
                    entity: entity,
                    coordinates: {
                        lat: lat,
                        lon: lon,
                        alt: alt
                    }
                };
                window.droneListManager.addDrone(droneData);
            }

            // Fly camera to the drone
            window.viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, 200),
                orientation: {
                    heading: 0.0,
                    pitch: -Cesium.Math.PI_OVER_FOUR,
                    roll: 0.0
                },
                duration: 2
            });
            
            // Successfully added drone to map
            return entity;

        } catch (error) {
            console.error('Error loading drone model:', error);
            throw error;
        }
    }
    
    showNotification(message, type = 'info') {
        // Notification sent
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `drone-notification ${type}`;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
}

// Initialize immediately when script loads
function initializeDroneManager() {
    // Initializing drone manager
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // DOM loaded, creating manager
            droneConfigManager = new DroneConfigurationManager();
            window.droneConfigManager = droneConfigManager;
        });
    } else {
        // DOM already loaded, creating manager
        droneConfigManager = new DroneConfigurationManager();
        window.droneConfigManager = droneConfigManager;
    }
}

// Call initialization function
initializeDroneManager(); 