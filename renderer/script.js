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
    setupMissionControls();
    
    // Wait for sidebar manager to be ready, then set initial state
    setTimeout(() => {
        if (window.sidebarManager) {
            // Initialize with dashboard and telemetry panels
            window.sidebarManager.toggleLeftSidebar('dashboard');
            window.sidebarManager.toggleRightSidebar('telemetry');
        }
        
        // Initialize AI Agent instance when panel is opened
        if (window.AIAgent) {
            window.aiAgentInstance = new window.AIAgent();
        }
        
        // Also create it when AI panel is opened
        const originalToggleRightSidebar = window.sidebarManager?.toggleRightSidebar;
        if (originalToggleRightSidebar && window.sidebarManager) {
            window.sidebarManager.toggleRightSidebar = function(panelName) {
                originalToggleRightSidebar.call(this, panelName);
                
                if (panelName === 'aiAgent') {
                    setTimeout(() => {
                        if (window.AIAgent && !window.aiAgentInstance) {
                            window.aiAgentInstance = new window.AIAgent();
                        }
                    }, 500);
                }
            };
        }
        
        // Set up mission data file watcher after map is initialized
        watchMissionDataChanges();
        
        // Initialize WebSocket drone simulation after map is ready
        setTimeout(() => {
            initializeWebSocketDrone();
        }, 2000);
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
    } else if (lowerCommand.includes('websocket drone') || lowerCommand.includes('start drone')) {
        initializeWebSocketDrone();
    } else if (lowerCommand.includes('disconnect drone') || lowerCommand.includes('stop drone')) {
        disconnectWebSocketDrone();
    } else if (lowerCommand.includes('reset drone')) {
        resetDronePosition();
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
        showNotification('Cesium library failed to load. Check internet connection.', 'error');
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
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMDQ4NTQxZC1iYTdhLTQwMzAtOWQxMS1jYTU0YjY3ZDNhZTgiLCJpZCI6MjcxMjA5LCJpYXQiOjE3NTMzNzQ4NTV9.Q5xerWBCH6ggHU9p-U4CdIBJCHtrT5vwXVLRqGqS_1Y';

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
            showNotification('High-quality terrain loaded', 'success');
        } catch (error) {
            showNotification('Terrain failed to load - using default', 'warning');
        }

        // Load Cesium Ion imagery using the proper async method
        try {
            viewer.imageryLayers.removeAll();
            const layer = viewer.imageryLayers.addImageryProvider(
                await Cesium.IonImageryProvider.fromAssetId(2),
            );
            showNotification('Satellite imagery loaded', 'success');
        } catch (error) {
            showNotification('Imagery failed to load - check token', 'error');
        }

        // Add the specified 3D model
        try {
            const tileset = await viewer.scene.primitives.add(
                await Cesium.Cesium3DTileset.fromIonAssetId(3013232)
            );
            showNotification('Custom 3D model loaded', 'success');
        } catch (error) {
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
            const osmBuildings = await viewer.scene.primitives.add(
                await Cesium.Cesium3DTileset.fromIonAssetId(96188)
            );
            showNotification('3D OSM Buildings loaded', 'success');
        } catch (error) {
            showNotification('OSM Buildings failed to load', 'warning');
        }

        // Add mission entities from JSON data
        addMissionEntities();

        // Add imagery error handling - Cesium Ion only
        viewer.scene.imageryLayers.layerAdded.addEventListener(function(layer) {
            layer.imageryProvider.errorEvent.addEventListener(function(error) {
                showNotification('Cesium Ion imagery failed to load - check token and connection', 'warning');
            });
        });

        // Store viewer globally for access from other functions
        window.viewer = viewer; // Make sure it's available globally
        window.cesiumViewer = viewer;

        showNotification('Cesium map with satellite imagery loaded', 'success');
        
        // Initialize map controls manager after viewer is ready
        setTimeout(() => {
            if (window.MapControlsManager) {
                window.mapControlsManager = new MapControlsManager();
            }
            
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
        // Use more robust path resolution for Electron
        const missionDataUrl = new URL('mission-data.json', window.location.href).href;
        const response = await fetch(missionDataUrl);
        const missionData = await response.json();
        return missionData;
    } catch (error) {
        showNotification('Failed to load mission data', 'error');
        return null;
    }
}

async function addMissionEntities() {
    if (!viewer) return;

    try {
        // Load mission data from JSON
        const missionData = await loadMissionData();
        if (!missionData) {
            showNotification('No mission data available', 'error');
            return;
        }

        const mission = missionData.mission;

        // Add the drone from JSON data
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

        // Add waypoints from mission data
        if (mission.waypoints && mission.waypoints.length > 0) {
            const waypointEntities = [];
            const waypointPositions = [];

            // Add each waypoint
            mission.waypoints.forEach((waypoint, index) => {
                const position = Cesium.Cartesian3.fromDegrees(
                    waypoint.longitude,
                    waypoint.latitude,
                    waypoint.altitude
                );
                
                waypointPositions.push(position);
                
                const waypointEntity = viewer.entities.add({
                    id: waypoint.id,
                    position: position,
                    point: {
                        pixelSize: 12,
                        color: Cesium.Color.CYAN,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        heightReference: Cesium.HeightReference.NONE
                    },
                    label: {
                        text: `${waypoint.name}\n${waypoint.altitude}m`,
                        font: '12pt sans-serif',
                        pixelOffset: new Cesium.Cartesian2(0, -40),
                        fillColor: Cesium.Color.CYAN,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        scale: 0.8,
                        heightReference: Cesium.HeightReference.NONE
                    }
                });
                
                waypointEntities.push(waypointEntity);
            });

            // Create connecting lines between waypoints
            if (waypointPositions.length > 1) {
                // Add line from drone to first waypoint
                const droneToFirstWaypoint = viewer.entities.add({
                    id: 'flightPath_droneToFirst',
                    polyline: {
                        positions: [
                            Cesium.Cartesian3.fromDegrees(
                                mission.drone.longitude,
                                mission.drone.latitude,
                                mission.drone.altitude
                            ),
                            waypointPositions[0]
                        ],
                        width: 3,
                        material: Cesium.Color.ORANGE,
                        clampToGround: false
                    }
                });

                // Add lines connecting all waypoints
                for (let i = 0; i < waypointPositions.length - 1; i++) {
                    const flightPathEntity = viewer.entities.add({
                        id: `flightPath_segment_${i}`,
                        polyline: {
                            positions: [waypointPositions[i], waypointPositions[i + 1]],
                            width: 3,
                            material: Cesium.Color.YELLOW,
                            clampToGround: false
                        }
                    });
                }

                // Add return line from last waypoint to drone
                const lastWaypointToDrone = viewer.entities.add({
                    id: 'flightPath_lastToDrone',
                    polyline: {
                        positions: [
                            waypointPositions[waypointPositions.length - 1],
                            Cesium.Cartesian3.fromDegrees(
                                mission.drone.longitude,
                                mission.drone.latitude,
                                mission.drone.altitude
                            )
                        ],
                        width: 3,
                        material: Cesium.Color.RED,
                        clampToGround: false
                    }
                });
            }

            showNotification(`${mission.waypoints.length} waypoints and flight paths added`, 'success');
        }

        showNotification(`Drone loaded: ${mission.drone.name}`, 'success');
        
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
        showNotification('Mission entities may not be visible', 'warning');
    }
}

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
window.avionixisAPI = {
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

// Add this function to watch for JSON file changes
async function watchMissionDataChanges() {
    if (!viewer) return;
    
    // Function to reload mission data and update map
    async function reloadMissionData() {
        try {
            // Remove all existing mission entities
            const entitiesToRemove = [];
            viewer.entities.values.forEach(entity => {
                if (entity.id === 'mainDrone' || entity.id === 'flightPath' || 
                    entity.id === 'homeBase' || entity.id.startsWith('waypoint_') ||
                    entity.id.startsWith('flightPath_')) {
                    entitiesToRemove.push(entity);
                }
            });
            
            entitiesToRemove.forEach(entity => {
                viewer.entities.remove(entity);
            });
            
            // Reload and add new entities
            await addMissionEntities();
            
            showNotification('Mission data updated from JSON file', 'success');
        } catch (error) {
            showNotification('Failed to reload mission data', 'error');
        }
    }
    
    // Set up file watcher using Electron's fs module
    const fs = require('fs');
    const path = require('path');
    
    // More robust path resolution for the mission data file
    let missionDataPath;
    try {
        // Try different path resolution methods
        const rendererDir = __dirname;
        missionDataPath = path.join(rendererDir, 'mission-data.json');
        
        // Verify the file exists
        if (!fs.existsSync(missionDataPath)) {
            // Fallback to process.cwd() if __dirname doesn't work
            missionDataPath = path.join(process.cwd(), 'renderer', 'mission-data.json');
            if (!fs.existsSync(missionDataPath)) {
                throw new Error('Mission data file not found in expected locations');
            }
        }
        
        // Watch for changes in the mission-data.json file
        fs.watchFile(missionDataPath, { interval: 1000 }, (curr, prev) => {
            if (curr.mtime > prev.mtime) {
                reloadMissionData();
            }
        });
        
    } catch (error) {
        showNotification('File watcher setup failed - manual reload may be needed', 'warning');
    }
}

// Handle window focus for development
window.addEventListener('focus', () => {
    // Window focused event
});

// Global error handling
window.addEventListener('error', (e) => {
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

// Add this function after the other setup functions
function setupMissionControls() {
    // Add reload button event listener if it exists
    const reloadMissionBtn = document.getElementById('reloadMissionBtn');
    if (reloadMissionBtn) {
        reloadMissionBtn.addEventListener('click', async () => {
            await reloadMissionDataFromFile();
        });
    }
    
    // Add a keyboard shortcut for reloading (Ctrl+R)
    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            await reloadMissionDataFromFile();
        }
    });
}

// Manual reload function that can be called from the UI or keyboard shortcut
async function reloadMissionDataFromFile() {
    if (!window.viewer) {
        showNotification('Map not ready for reload', 'error');
        return;
    }
    
    try {
        showNotification('Reloading mission data...', 'info');
        
        // Remove all existing mission entities
        const entitiesToRemove = [];
        window.viewer.entities.values.forEach(entity => {
            if (entity.id === 'mainDrone' || entity.id === 'flightPath' || 
                entity.id === 'homeBase' || entity.id.startsWith('waypoint_') ||
                entity.id.startsWith('flightPath_')) {
                entitiesToRemove.push(entity);
            }
        });
        
        entitiesToRemove.forEach(entity => {
            window.viewer.entities.remove(entity);
        });
        
        // Reload and add new entities
        await addMissionEntities();
        
        showNotification('Mission data reloaded manually', 'success');
    } catch (error) {
        showNotification('Failed to reload mission data', 'error');
    }
}

// Make it globally available
window.reloadMissionDataFromFile = reloadMissionDataFromFile; 

let websocketDrone = null;
let websocketConnection = null;
let dronePosition = {
    lat: 9.5812,  // Start with your actual coordinates
    lon: 77.6842,
    alt: 0
};
let messageCount = 0;
let lastMessageTime = null;
let isFirstMessage = true;  // Track if this is the first message

function initializeWebSocketDrone() {
    if (!viewer) {
        return;
    }

    // Create the initial drone entity
    websocketDrone = viewer.entities.add({
        id: 'websocketDrone',
        position: Cesium.Cartesian3.fromDegrees(
            dronePosition.lon,
            dronePosition.lat,
            dronePosition.alt
        ),
        box: {
            dimensions: new Cesium.Cartesian3(50, 50, 15),
            material: Cesium.Color.YELLOW.withAlpha(0.9),
            outline: true,
            outlineColor: Cesium.Color.BLACK,
            heightReference: Cesium.HeightReference.NONE
        },
        label: {
            text: 'Drone 1',
            font: '16pt sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -90),
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            scale: 1.2,
            heightReference: Cesium.HeightReference.NONE
        }
    });

    // Fly to the drone
    setTimeout(() => {
        viewer.flyTo(websocketDrone, {
            duration: 3.0,
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(0),
                Cesium.Math.toRadians(-45),
                2000
            )
        });
    }, 1000);

    // Connect to WebSocket
    connectWebSocket();
    
    showNotification('WebSocket drone initialized at actual coordinates', 'success');
}

function connectWebSocket() {
    try {
        websocketConnection = new WebSocket('ws://localhost:8000/ws');
        
        websocketConnection.onopen = function(event) {
            showNotification('WebSocket connected to drone server', 'success');
            
            // Reset message counter
            messageCount = 0;
            lastMessageTime = null;
        };
        
        websocketConnection.onmessage = function(event) {
            messageCount++;
            lastMessageTime = new Date();
            
            try {
                const droneData = JSON.parse(event.data);
                
                // Validate the expected data format
                if (!droneData.drone_status) {
                    showNotification('Missing drone_status in data', 'warning');
                    return;
                }
                
                if (!droneData.drone_status.current_position) {
                    showNotification('Missing current_position in drone_status', 'warning');
                    return;
                }
                
                const currentPos = droneData.drone_status.current_position;
                const deltaData = {
                    lat: droneData.lat || 0,
                    lon: droneData.lon || 0, 
                    alt: droneData.alt || 0
                };
                
                // Validate position data
                if (typeof currentPos.lat !== 'number' || 
                    typeof currentPos.lon !== 'number' || 
                    typeof currentPos.alt !== 'number') {
                    showNotification('Invalid position coordinates received', 'error');
                    return;
                }
                
                // Check if position values are reasonable (not NaN or Infinity)
                if (!isFinite(currentPos.lat) || !isFinite(currentPos.lon) || !isFinite(currentPos.alt)) {
                    showNotification('Invalid position numbers received', 'error');
                    return;
                }
                
                // Ensure drone entity exists
                if (!websocketDrone) {
                    initializeWebSocketDrone();
                    // Wait a bit for entity creation
                    setTimeout(() => {
                        updateDronePositionFromReal(currentPos, deltaData, droneData);
                    }, 100);
                } else {
                    updateDronePositionFromReal(currentPos, deltaData, droneData);
                }
                
            } catch (error) {
                showNotification('Error processing drone data: ' + error.message, 'error');
            }
        };
        
        websocketConnection.onclose = function(event) {
            showNotification('WebSocket connection closed', 'warning');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (!websocketConnection || websocketConnection.readyState === WebSocket.CLOSED) {
                    connectWebSocket();
                }
            }, 3000);
        };
        
        websocketConnection.onerror = function(error) {
            showNotification('WebSocket connection error', 'error');
        };
        
    } catch (error) {
        showNotification('Failed to connect to drone WebSocket', 'error');
    }
}

function updateDronePositionFromReal(currentPos, deltaData, fullDroneData) {
    if (!websocketDrone) {
        // Try to create the drone entity if it doesn't exist
        initializeWebSocketDrone();
        return;
    }
    
    if (!viewer) {
        return;
    }
    
    // Store previous position for debugging
    const beforePosition = { ...dronePosition };
    
    // Update to the actual current position from drone
    dronePosition.lat = currentPos.lat;
    dronePosition.lon = currentPos.lon;
    dronePosition.alt = currentPos.alt;
    
    try {
        // Create new position object
        const newPosition = Cesium.Cartesian3.fromDegrees(
            dronePosition.lon,
            dronePosition.lat, 
            dronePosition.alt
        );
        
        // Update the drone entity position
        websocketDrone.position = newPosition;
        
        // Force a render update
        viewer.scene.requestRender();
        
        // If this is the first message, fly to the drone
        if (isFirstMessage) {
            setTimeout(() => {
                viewer.flyTo(websocketDrone, {
                    duration: 4.0,
                    offset: new Cesium.HeadingPitchRange(
                        Cesium.Math.toRadians(0),
                        Cesium.Math.toRadians(-45),
                        2000
                    )
                });
                isFirstMessage = false;
                showNotification('Flying to drone location!', 'success');
            }, 500);
        }
        
    } catch (error) {
        showNotification('Error updating drone position: ' + error.message, 'error');
        return;
    }
    
    // Update status bar with current altitude and mode
    updateStatusBar('right', `Alt: ${dronePosition.alt.toFixed(1)}m | ${fullDroneData.drone_status.mode}`);
    
    // Show success notification for first few updates
    if (messageCount <= 3) {
        showNotification(`Drone position updated! (${messageCount}/${3})`, 'success');
    }
}

function disconnectWebSocketDrone() {
    if (websocketConnection) {
        websocketConnection.close();
        websocketConnection = null;
        showNotification('WebSocket drone disconnected', 'warning');
    } else {
        showNotification('WebSocket drone is not connected', 'info');
    }
}

function resetDronePosition() {
    // Reset position to initial values (your actual coordinates)
    dronePosition = {
        lat: -35.3632622,
        lon: 149.1652375,
        alt: 0
    };
    
    // Update the drone entity if it exists
    if (websocketDrone) {
        websocketDrone.position = Cesium.Cartesian3.fromDegrees(
            dronePosition.lon,
            dronePosition.lat,
            dronePosition.alt
        );
        
        // Fly to the reset position
        viewer.flyTo(websocketDrone, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(0),
                Cesium.Math.toRadians(-45),
                2000
            )
        });
    }
    
    showNotification('Drone position reset to actual coordinates', 'success');
    updateStatusBar('right', `Alt: ${dronePosition.alt.toFixed(1)}m | MANUAL`);
}

// Add WebSocket drone functions to the global API
window.avionixisAPI.initializeWebSocketDrone = initializeWebSocketDrone;
window.avionixisAPI.disconnectWebSocketDrone = disconnectWebSocketDrone;
window.avionixisAPI.resetDronePosition = resetDronePosition; 