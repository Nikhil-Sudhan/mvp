// Drone configuration constants
const HOME_LOCATION = {
    latitude: 9.581092224928884,  // San Francisco coordinates as example
    longitude: 77.68423117301315,
    altitude: 50 // meters above ground
};

const DRONE_MODELS = {
    'hovermax': {
        ionAssetId: 3013232,
        scale: 1.0,
        minimumPixelSize: 128
    },
    'phantom-x2': {
        ionAssetId: 3013232, // Using same asset ID for example
        scale: 0.8,
        minimumPixelSize: 128
    }
};

// Initialize immediately to ensure event listeners are attached
let droneConfigManager;

class DroneConfigurationManager {
    constructor() {
        console.log("Initializing DroneConfigurationManager");
        this.initializeUI();
        this.bindEvents();
    }

    initializeUI() {
        this.addDroneBtn = document.getElementById('addDroneBtn');
        this.droneDropdown = document.getElementById('droneDropdown');
        this.droneOptions = document.querySelectorAll('.drone-option');
        
        console.log("UI Elements:", {
            addDroneBtn: this.addDroneBtn,
            droneDropdown: this.droneDropdown,
            droneOptions: this.droneOptions
        });
    }

    bindEvents() {
        if (!this.addDroneBtn) {
            console.error("Add Drone button not found!");
            return;
        }

        // Toggle dropdown
        this.addDroneBtn.addEventListener('click', (e) => {
            console.log("Add Drone button clicked");
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
                    console.log("Drone option clicked:", option.dataset.drone);
                    this.handleDroneSelection(option);
                });
            });
        } else {
            console.error("No drone options found!");
        }
    }

    async handleDroneSelection(option) {
        const droneType = option.dataset.drone;
        console.log(`Selected drone: ${droneType}`);
        this.droneDropdown.classList.add('hidden');
        
        try {
            await this.addDroneToMap(droneType);
            this.showNotification(`Added ${droneType} drone to map`, 'success');
        } catch (error) {
            console.error('Failed to add drone to map:', error);
            this.showNotification(`Failed to add drone: ${error.message}`, 'error');
        }
    }

    async addDroneToMap(droneType) {
        const modelConfig = DRONE_MODELS[droneType];
        if (!modelConfig) {
            throw new Error(`Unknown drone type: ${droneType}`);
        }
        
        if (!window.viewer) {
            throw new Error("Cesium viewer not initialized");
        }
        
        console.log(`Adding ${droneType} drone to map`);
        
        // Create Cesium position from home location
        const position = Cesium.Cartesian3.fromDegrees(
            HOME_LOCATION.longitude,
            HOME_LOCATION.latitude,
            HOME_LOCATION.altitude
        );

        try {
            console.log(`Loading 3D tileset for ${droneType}`);
            
            // Load the 3D tileset
            const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(modelConfig.ionAssetId);
            
            // Configure the tileset
            tileset.scale = modelConfig.scale;
            tileset.minimumPixelSize = modelConfig.minimumPixelSize;

            // Add to scene
            window.viewer.scene.primitives.add(tileset);
            console.log("Added tileset to scene");

            // Position the model
            tileset.modelMatrix = Cesium.Matrix4.fromTranslation(position);

            // Fly camera to the drone
            window.viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    HOME_LOCATION.longitude,
                    HOME_LOCATION.latitude,
                    HOME_LOCATION.altitude + 200 // Camera position 200m above drone
                ),
                orientation: {
                    heading: 0.0,
                    pitch: -Cesium.Math.PI_OVER_FOUR,
                    roll: 0.0
                },
                duration: 2
            });
            
            console.log(`Successfully added ${droneType} drone to map`);
            return tileset;

        } catch (error) {
            console.error('Error loading drone model:', error);
            throw error;
        }
    }
    
    showNotification(message, type = 'info') {
        console.log(`Notification: ${message} (${type})`);
        
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
    console.log("Initializing drone manager...");
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log("DOM loaded, creating manager");
            droneConfigManager = new DroneConfigurationManager();
            window.droneConfigManager = droneConfigManager;
        });
    } else {
        console.log("DOM already loaded, creating manager");
        droneConfigManager = new DroneConfigurationManager();
        window.droneConfigManager = droneConfigManager;
    }
}

// Call initialization function
initializeDroneManager(); 