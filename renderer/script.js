const { ipcRenderer } = require('electron');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    setupWindowControls();
    setupCommandPalette();
    setupCesiumMap();
    setupStatusBarUpdates();
    
    // Wait for sidebar manager to be ready, then set initial state
    setTimeout(() => {
        if (window.sidebarManager) {
            // Initialize with dashboard and telemetry panels
            window.sidebarManager.toggleLeftSidebar('dashboard');
            window.sidebarManager.toggleRightSidebar('telemetry');
        }
    }, 100);
}

// Window controls functionality
function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            ipcRenderer.send('window-minimize');
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            ipcRenderer.send('window-maximize');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.send('window-close');
        });
    }
}

// Command palette functionality
function setupCommandPalette() {
    const commandInput = document.getElementById('commandInput');
    
    if (commandInput) {
        commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const command = commandInput.value.trim();
                if (command) {
                    executeCommand(command);
                    commandInput.value = '';
                }
            }
        });

        // Focus command palette with Ctrl+Shift+P
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                commandInput.focus();
            }

            // Escape to clear command palette
            if (e.key === 'Escape') {
                commandInput.blur();
                commandInput.value = '';
            }
        });
    }
}

// Execute commands from the command palette
function executeCommand(command) {
    const lowerCommand = command.toLowerCase();
    
    // Panel switching commands
    if (lowerCommand.includes('dashboard')) {
        window.sidebarManager?.toggleLeftSidebar('dashboard');
    } else if (lowerCommand.includes('drone config') || lowerCommand.includes('configuration')) {
        window.sidebarManager?.toggleLeftSidebar('droneConfiguration');
    } else if (lowerCommand.includes('mission') || lowerCommand.includes('track')) {
        window.sidebarManager?.toggleLeftSidebar('trackMission');
    } else if (lowerCommand.includes('help')) {
        window.sidebarManager?.toggleLeftSidebar('help');
    } else if (lowerCommand.includes('profile')) {
        window.sidebarManager?.toggleLeftSidebar('profile');
    } else if (lowerCommand.includes('settings')) {
        window.sidebarManager?.toggleLeftSidebar('settings');
    } else if (lowerCommand.includes('ai') || lowerCommand.includes('assistant')) {
        window.sidebarManager?.toggleRightSidebar('aiAgent');
    } else if (lowerCommand.includes('telemetry') || lowerCommand.includes('data')) {
        window.sidebarManager?.toggleRightSidebar('telemetry');
    } else if (lowerCommand.includes('takeoff')) {
        executeDroneFunction('takeoff');
    } else if (lowerCommand.includes('land')) {
        executeDroneFunction('land');
    } else if (lowerCommand.includes('hover')) {
        executeDroneFunction('hover');
    } else if (lowerCommand.includes('return')) {
        executeDroneFunction('return');
    } else {
        // Show a notification for unrecognized commands
        showNotification(`Command "${command}" not recognized. Try "dashboard", "mission", "help", etc.`, 'warning');
    }
}

// Cesium Map Setup
let viewer;

async function setupCesiumMap() {
    // Check if Cesium is loaded
    if (typeof Cesium === 'undefined') {
        console.error('Cesium is not loaded. Check if the CDN is accessible.');
        showNotification('Cesium library failed to load. Check internet connection.', 'error');
        return;
    }

    try {
        console.log('Initializing Cesium map...');
        
        // Check WebGL support first
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL not supported by this browser/system');
        }
        console.log('WebGL support confirmed');
        
        // Set the Cesium Ion access token for premium features
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMDQ4NTQxZC1iYTdhLTQwMzAtOWQxMS1jYTU0YjY3ZDNhZTgiLCJpZCI6MjcxMjA5LCJpYXQiOjE3NTMzNzQ4NTV9.Q5xerWBCH6ggHU9p-U4CdIBJCHtrT5vwXVLRqGqS_1Y';
        
        console.log('Cesium Ion token set successfully');

        // Check if container exists
        const container = document.getElementById('cesiumContainer');
        if (!container) {
            throw new Error('Cesium container not found');
        }

        console.log('Creating Cesium viewer...');
        
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
            console.log('Loading Cesium World Terrain...');
            const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
            viewer.terrainProvider = terrainProvider;
            console.log('Cesium World Terrain loaded successfully');
            showNotification('High-quality terrain loaded', 'success');
        } catch (error) {
            console.error('Failed to load terrain:', error);
            showNotification('Terrain failed to load - using default', 'warning');
        }

        // Load Cesium Ion imagery using the proper async method
        try {
            console.log('Loading Cesium Ion imagery (Asset ID 2)...');
            viewer.imageryLayers.removeAll();
            const layer = viewer.imageryLayers.addImageryProvider(
                await Cesium.IonImageryProvider.fromAssetId(2),
            );
            console.log('Cesium Ion imagery loaded successfully');
            showNotification('Satellite imagery loaded', 'success');
        } catch (error) {
            console.error('Failed to load Cesium Ion imagery:', error);
            showNotification('Imagery failed to load - check token', 'error');
        }

        // Add the specified 3D model
        try {
            console.log('Loading custom 3D model...');
            const tileset = await viewer.scene.primitives.add(
                await Cesium.Cesium3DTileset.fromIonAssetId(3013232)
            );
            console.log('Custom 3D model loaded successfully');
            showNotification('Custom 3D model loaded', 'success');
        } catch (error) {
            console.error('Failed to load custom 3D model:', error);
            showNotification('Custom 3D model failed to load', 'warning');
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
            console.log('Loading Cesium OSM Buildings...');
            const osmBuildings = await viewer.scene.primitives.add(
                await Cesium.Cesium3DTileset.fromIonAssetId(96188)
            );
            console.log('Cesium OSM Buildings loaded successfully');
            showNotification('3D OSM Buildings loaded', 'success');
        } catch (error) {
            console.error('Failed to load OSM Buildings:', error);
            showNotification('OSM Buildings failed to load', 'warning');
        }

        // Add mission entities from JSON data
        addMissionEntities();

        // Add imagery error handling - Cesium Ion only
        viewer.scene.imageryLayers.layerAdded.addEventListener(function(layer) {
            layer.imageryProvider.errorEvent.addEventListener(function(error) {
                console.warn('Cesium Ion imagery loading error:', error);
                showNotification('Cesium Ion imagery failed to load - check token and connection', 'warning');
            });
        });

        // Store viewer globally for access from other functions
        window.viewer = viewer; // Make sure it's available globally
        window.cesiumViewer = viewer;

        console.log('Cesium map initialized successfully');
        showNotification('Cesium map with satellite imagery loaded', 'success');
        
        // Initialize map controls manager after viewer is ready
        setTimeout(() => {
            if (window.MapControlsManager) {
                window.mapControlsManager = new MapControlsManager();
            }
            
            // Initialize drone configuration manager if available
            if (typeof DroneConfigurationManager !== 'undefined') {
                console.log('Initializing drone configuration manager');
                window.droneConfigManager = new DroneConfigurationManager();
            }
        }, 1000);
    } catch (error) {
        console.error('Detailed error initializing Cesium map:', error);
        console.error('Error stack:', error.stack);
        
        // Show more specific error message
        let errorMessage = 'Failed to initialize map: ';
        if (error.message.includes('container')) {
            errorMessage += 'Container element not found';
        } else if (error.message.includes('WebGL')) {
            errorMessage += 'WebGL not supported';
        } else {
            errorMessage += error.message;
        }
        
                          showNotification(errorMessage, 'error');
         
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

async function loadMissionData() {
    try {
        console.log('Loading mission data from JSON...');
        const response = await fetch('./mission-data.json');
        const missionData = await response.json();
        console.log('Mission data loaded successfully:', missionData);
        return missionData;
    } catch (error) {
        console.error('Failed to load mission data:', error);
        showNotification('Failed to load mission data', 'error');
        return null;
    }
}

async function addMissionEntities() {
    if (!viewer) return;

    console.log('Adding mission entities...');

    try {
        // Load mission data from JSON
        const missionData = await loadMissionData();
        if (!missionData) {
            showNotification('No mission data available', 'error');
            return;
        }

        const mission = missionData.mission;

        // Add drone from JSON data
        const droneEntity = viewer.entities.add({
            id: 'mainDrone',
            position: Cesium.Cartesian3.fromDegrees(
                mission.drone.longitude, 
                mission.drone.latitude, 
                mission.drone.altitude
            ),
            // 3D Box representing the drone
            box: {
                dimensions: new Cesium.Cartesian3(40, 40, 10),
                material: Cesium.Color.YELLOW.withAlpha(0.8),
                outline: true,
                outlineColor: Cesium.Color.BLACK,
                heightReference: Cesium.HeightReference.NONE
            },
            point: {
                pixelSize: 15,
                color: Cesium.Color.YELLOW,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.NONE,
                show: false
            },
            label: {
                text: `${mission.drone.name}\n${mission.drone.description}`,
                font: '14pt sans-serif',
                pixelOffset: new Cesium.Cartesian2(0, -80),
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                scale: 1.0,
                heightReference: Cesium.HeightReference.NONE
            }
        });

        // Create flight path positions from JSON waypoints
        const flightPathPositions = [
            mission.drone.longitude, mission.drone.latitude, mission.drone.altitude,
            ...mission.waypoints.flatMap(wp => [wp.longitude, wp.latitude, wp.altitude])
        ];

        // Add flight path from JSON data
        const flightPath = viewer.entities.add({
            id: 'flightPath',
            polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(flightPathPositions),
                width: mission.flightPath.width,
                clampToGround: false,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: mission.flightPath.glowPower,
                    color: Cesium.Color[mission.flightPath.color]
                })
            }
        });

        // Add waypoints from JSON data
        mission.waypoints.forEach((waypoint) => {
            viewer.entities.add({
                id: waypoint.id,
                position: Cesium.Cartesian3.fromDegrees(
                    waypoint.longitude, 
                    waypoint.latitude, 
                    waypoint.altitude
                ),
                point: {
                    pixelSize: 12,
                    color: Cesium.Color.ORANGE,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.NONE
                },
                label: {
                    text: `${waypoint.name}\n${waypoint.description}`,
                    font: '12pt sans-serif',
                    pixelOffset: new Cesium.Cartesian2(0, -40),
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 1,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    heightReference: Cesium.HeightReference.NONE
                }
            });
        });

        // Add home base from JSON data
        viewer.entities.add({
            id: 'homeBase',
            position: Cesium.Cartesian3.fromDegrees(
                mission.homeBase.longitude, 
                mission.homeBase.latitude, 
                mission.homeBase.altitude
            ),
            cylinder: {
                length: 20,
                topRadius: 100,
                bottomRadius: 100,
                material: Cesium.Color.GREEN.withAlpha(0.8),
                outline: true,
                outlineColor: Cesium.Color.DARKGREEN,
                outlineWidth: 3,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            },
            label: {
                text: `${mission.homeBase.name}\n${mission.homeBase.description}`,
                font: '12pt sans-serif',
                pixelOffset: new Cesium.Cartesian2(0, -120),
                fillColor: Cesium.Color.GREEN,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            }
        });

        console.log('Mission entities added successfully');
        showNotification(`Mission loaded: ${mission.name}`, 'success');
        
        // Fly to the drone location with 3D perspective after a short delay
        setTimeout(() => {
            viewer.flyTo(droneEntity, {
                duration: 4.0,
                offset: new Cesium.HeadingPitchRange(
                    Cesium.Math.toRadians(45), // Angled heading
                    Cesium.Math.toRadians(-25), // Look down angle
                    1500 // Distance for good 3D perspective
                )
            });
        }, 2000);

    } catch (error) {
        console.error('Error adding mission entities:', error);
        showNotification('Some mission features may not be visible', 'warning');
    }
}

// Map Controls are now handled by MapControlsManager
// The old setupMapControls function has been replaced with a more robust solution

// Drone function execution
function executeDroneFunction(functionName) {
    const statusMessages = {
        'takeoff': 'Takeoff initiated. Drone ascending to hover altitude.',
        'land': 'Landing initiated. Drone descending to ground level.',
        'hover': 'Hover mode activated. Drone maintaining current position.',
        'return': 'Return to home initiated. Drone returning to launch point.'
    };

    const message = statusMessages[functionName] || `Function "${functionName}" executed successfully.`;
    
    // Update status bar
    updateStatusBar('center', `Status: ${message}`);
    
    // Show notification
    showNotification(message, 'success');

    // Simulate telemetry updates
    if (functionName === 'takeoff') {
        setTimeout(() => updateTelemetryData({ altitude: '5.0m', speed: '2.1 m/s' }), 2000);
    } else if (functionName === 'land') {
        setTimeout(() => updateTelemetryData({ altitude: '0.0m', speed: '0.0 m/s' }), 3000);
    }
}

// Update telemetry data
function updateTelemetryData(data) {
    // This will be handled by the telemetry component when it's loaded
    if (window.telemetryInstance) {
        if (data.altitude) window.telemetryInstance.updateAltitude(data.altitude);
        if (data.speed) window.telemetryInstance.updateSpeed(data.speed);
        if (data.battery) window.telemetryInstance.updateBattery(data.battery);
    }
}

// Update status bar
function updateStatusBar(section, text) {
    const statusSection = document.querySelector(`.status-${section}`);
    if (statusSection) {
        const statusItem = statusSection.querySelector('.status-item span');
        if (statusItem) {
            statusItem.textContent = text;
        }
    }
}

// Show notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show with animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Status bar real-time updates
function setupStatusBarUpdates() {
    setInterval(() => {
        // Simulate battery drain
        const batteryElements = document.querySelectorAll('.status-item span');
        batteryElements.forEach(el => {
            if (el.textContent.includes('Battery:')) {
                const currentBattery = parseInt(el.textContent.match(/\d+/)[0]);
                if (currentBattery > 95) {
                    const newBattery = Math.max(95, currentBattery - Math.random() * 0.1);
                    el.textContent = `Battery: ${Math.round(newBattery)}%`;
                }
            }
        });

        // Update timestamp
        const now = new Date();
        const statusCenter = document.querySelector('.status-center .status-item span');
        if (statusCenter && !statusCenter.textContent.includes('Status:')) {
            // Only update if it's not showing a status message
            statusCenter.textContent = `Time: ${now.toLocaleTimeString()}`;
        }

    }, 5000); // Update every 5 seconds
}

// Global API for component communication
window.skyLoomAPI = {
    executeCommand: executeCommand,
    executeDroneFunction: executeDroneFunction,
    updateTelemetryData: updateTelemetryData,
    updateStatusBar: updateStatusBar,
    showNotification: showNotification,
    
    // Map API
    getCesiumViewer: () => viewer,
    addDroneMarker: addDroneMarker,
    updateDronePosition: updateDronePosition,
    addFlightPath: addFlightPath,
    
    // Component registration
    registerComponent: function(name, instance) {
        window[`${name}Instance`] = instance;
    }
};

// Drone-specific map functions
function addDroneMarker(id, longitude, latitude, altitude = 100, label = 'Drone') {
    if (!viewer) return null;

    return viewer.entities.add({
        id: id,
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
        billboard: {
            image: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#007acc">
                    <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/>
                    <circle cx="8" cy="8" r="2" fill="#ffffff"/>
                    <circle cx="16" cy="8" r="2" fill="#ffffff"/>
                    <circle cx="8" cy="16" r="2" fill="#ffffff"/>
                    <circle cx="16" cy="16" r="2" fill="#ffffff"/>
                </svg>
            `),
            scale: 1.5,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM
        },
        label: {
            text: label,
            font: '12pt sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -50),
            fillColor: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE
        }
    });
}

function updateDronePosition(droneId, longitude, latitude, altitude = 100) {
    if (!viewer) return;

    const drone = viewer.entities.getById(droneId);
    if (drone) {
        drone.position = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
    }
}

function addFlightPath(positions, color = Cesium.Color.CYAN) {
    if (!viewer || !positions.length) return null;

    return viewer.entities.add({
        polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
            width: 3,
            clampToGround: false,
            material: color
        }
    });
}

// Function to display 3D model drones
function displayDrones() {
    const droneModels = Object.values(DRONE_MODELS);
    droneModels.forEach(async (model) => {
        try {
            console.log(`Loading drone model with Asset ID: ${model.ionAssetId}`);
            const tileset = await viewer.scene.primitives.add(
                await Cesium.Cesium3DTileset.fromIonAssetId(model.ionAssetId)
            );
            tileset.style = new Cesium.Cesium3DTileStyle({
                color: 'color("white")',
                show: true
            });
            tileset.scale = model.scale;
            tileset.minimumPixelSize = model.minimumPixelSize;
            console.log('Drone model loaded successfully');
            showNotification('Drone model loaded', 'success');
        } catch (error) {
            console.error('Failed to load drone model:', error);
            showNotification('Drone model failed to load', 'warning');
        }
    });
}

// Attach event listener to the test button
document.getElementById('testDronesBtn').addEventListener('click', displayDrones);

// Handle window focus for development
window.addEventListener('focus', () => {
    console.log('Sky Loom window focused');
});

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Sky Loom Error:', e.error);
    showNotification('An error occurred. Check console for details.', 'error');
});

// Development helpers
if (process.env.NODE_ENV === 'development') {
    window.dev = {
        openPanel: (side, panel) => {
            if (side === 'left') {
                window.sidebarManager?.toggleLeftSidebar(panel);
            } else {
                window.sidebarManager?.toggleRightSidebar(panel);
            }
        },
        executeCommand: executeCommand,
        simulateData: updateTelemetryData
    };
} 