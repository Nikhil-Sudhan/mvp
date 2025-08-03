// Cesium Map Setup and Management
let viewer;

async function setupCesiumMap() {
    // Check if Cesium is loaded
    if (typeof Cesium === 'undefined') {
        window.avionixisAPI?.showNotification('Cesium library failed to load. Check internet connection.', 'error');
        return;
    }

    try {
        // Check WebGL support first
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL not supported by this browser/system');
        }
        
        // Set the Cesium Ion access token for premium features
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNjFkZDVjMS1iMTEyLTRlN2QtOGUzZC03OGMxNjE2YzRlNzUiLCJpZCI6MjcxMjA5LCJpYXQiOjE3NTQyNDk1ODN9.Yh-Qc2YpqaKzU0y-Lm41fSdiaesXPacG5UQFdh5IWAA';

        // Check if container exists
        const container = document.getElementById('cesiumContainer');
        if (!container) {
            throw new Error('Cesium container not found');
        }
        
        // Initialize the Cesium viewer with full 3D capabilities (no imagery provider initially)
        viewer = new Cesium.Viewer('cesiumContainer', {
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: true, // Enable 3D/2D switching
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            infoBox: true, // Enable for 3D object interaction
            selectionIndicator: true,
            shadows: true, // Enable shadows for 3D effect
            terrainShadows: Cesium.ShadowMode.RECEIVE_ONLY,
            requestRenderMode: false,
            maximumRenderTimeChange: undefined
        });

        // Enable 3D features
        viewer.scene.globe.enableLighting = true; // Dynamic lighting
        viewer.scene.globe.showWaterEffect = true; // Water reflection
        viewer.scene.globe.atmosphereHue = 0.025; // Better atmosphere
        viewer.scene.globe.atmosphereSaturation = 1.9;
        viewer.scene.globe.atmosphereBrightness = 1.0;
        
        // Disable terrain exaggeration to prevent entity movement
        viewer.scene.globe.terrainExaggeration = 1.0;
        viewer.scene.globe.terrainExaggerationRelativeHeight = 0.0;

        // Force 3D mode
        viewer.scene.mode = Cesium.SceneMode.SCENE3D;
        
        // Enable fog for depth perception
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0002;

        // Set high-quality terrain from Cesium Ion
        try {
            const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
            viewer.terrainProvider = terrainProvider;
            window.avionixisAPI?.showNotification('High-quality terrain loaded', 'success');
        } catch (error) {
            window.avionixisAPI?.showNotification('Terrain failed to load - using default', 'warning');
        }

        // Load Cesium Ion imagery using the proper async method
        try {
            viewer.imageryLayers.removeAll();
            const layer = viewer.imageryLayers.addImageryProvider(
                await Cesium.IonImageryProvider.fromAssetId(2),
            );
            window.avionixisAPI?.showNotification('Satellite imagery loaded', 'success');
        } catch (error) {
            window.avionixisAPI?.showNotification('Imagery failed to load - check token', 'error');
        }

        // Add the specified 3D model
        try {
            const tileset = await viewer.scene.primitives.add(
                await Cesium.Cesium3DTileset.fromIonAssetId(3013232)
            );
            window.avionixisAPI?.showNotification('Custom 3D model loaded', 'success');
        } catch (error) {
            window.avionixisAPI?.showNotification('Custom 3D model failed to load', 'warning');
        }

        // Set the home location
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(77.68423117301315, 9.581092224928884, 5000.0), // Updated home location coordinates
            orientation: {
                heading: Cesium.Math.toRadians(45.0),
                pitch: Cesium.Math.toRadians(-30.0),
                roll: 0.0
            }
        });

        // Add Cesium OSM Buildings 3D tileset
        try {
            const osmBuildings = await viewer.scene.primitives.add(
                await Cesium.Cesium3DTileset.fromIonAssetId(96188)
            );
            window.avionixisAPI?.showNotification('3D OSM Buildings loaded', 'success');
        } catch (error) {
            window.avionixisAPI?.showNotification('OSM Buildings failed to load', 'warning');
        }

        // Add imagery error handling - Cesium Ion only
        viewer.scene.imageryLayers.layerAdded.addEventListener(function(layer) {
            layer.imageryProvider.errorEvent.addEventListener(function(error) {
                window.avionixisAPI?.showNotification('Cesium Ion imagery failed to load - check token and connection', 'warning');
            });
        });

        // Store viewer globally for access from other functions
        window.viewer = viewer; // Make sure it's available globally
        window.cesiumViewer = viewer;

        window.avionixisAPI?.showNotification('Cesium map with satellite imagery loaded', 'success');
        
        // MapControlsManager is initialized in mapControlsManager.js - no need to create duplicate here
        setTimeout(() => {
            // Initialize drone configuration manager if available
            if (typeof DroneConfigurationManager !== 'undefined') {
                window.droneConfigManager = new DroneConfigurationManager();
            }
        }, 1000);
    } catch (error) {
        // Show more specific error message
        let errorMessage = 'Failed to initialize map: ';
        if (error.message.includes('container')) {
            errorMessage += 'Container element not found';
        } else if (error.message.includes('WebGL')) {
            errorMessage += 'WebGL not supported';
        } else {
            errorMessage += error.message;
        }
        
        window.avionixisAPI?.showNotification(errorMessage, 'error');
         
         // Show Cesium-only error message
         const container = document.getElementById('cesiumContainer');
         if (container) {
             container.innerHTML = `
                 <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #cccccc; flex-direction: column; padding: 20px; text-align: center;">
                     <i class="fas fa-globe" style="font-size: 64px; color: #007acc; margin-bottom: 20px;"></i>
                     <h2>Cesium Ion Map Failed</h2>
                     <p style="margin-bottom: 20px;">Unable to initialize Cesium Ion 3D map</p>
                     <div style="background: rgba(70, 70, 71, 0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                         <h4 style="color: #ff9800; margin-bottom: 10px;">Error Details:</h4>
                         <p style="font-size: 13px; color: #cccccc;">${error.message}</p>
                     </div>
                     <button onclick="location.reload()" style="padding: 12px 24px; background: #007acc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                         <i class="fas fa-redo" style="margin-right: 8px;"></i>Retry Cesium Map
                     </button>
                 </div>
             `;
         }
     }
}

// Export functions for global access
window.CesiumMapAPI = {
    setupCesiumMap,
    getViewer: () => viewer
}; 