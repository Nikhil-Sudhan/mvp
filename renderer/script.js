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

// Cesium Map Setup - Now handled by CesiumMapAPI
async function setupCesiumMap() {
    if (window.CesiumMapAPI) {
        await window.CesiumMapAPI.setupCesiumMap();
    } else {
        showNotification('Cesium Map API not loaded', 'error');
    }
}

// Mission data functions now handled by MissionDataAPI
async function loadMissionData() {
    if (window.MissionDataAPI) {
        return await window.MissionDataAPI.loadMissionData();
    }
    return null;
}

async function addMissionEntities() {
    if (window.MissionDataAPI) {
        await window.MissionDataAPI.addMissionEntities();
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
    getCesiumViewer: () => window.viewer,
    addDroneMarker: addDroneMarker,
    updateDronePosition: updateDronePosition,
    addFlightPath: addFlightPath,
    
    // Component registration
    registerComponent: function(name, instance) {
        window[`${name}Instance`] = instance;
    }
};

// Map utility functions now handled by MapUtilsAPI
function addDroneMarker(id, longitude, latitude, altitude = 100, label = 'Drone') {
    if (window.MapUtilsAPI) {
        return window.MapUtilsAPI.addDroneMarker(id, longitude, latitude, altitude, label);
    }
    return null;
}

function updateDronePosition(droneId, longitude, latitude, altitude = 100) {
    if (window.MapUtilsAPI) {
        window.MapUtilsAPI.updateDronePosition(droneId, longitude, latitude, altitude);
    }
}

function addFlightPath(positions, color = Cesium.Color.CYAN) {
    if (window.MapUtilsAPI) {
        return window.MapUtilsAPI.addFlightPath(positions, color);
    }
    return null;
}

// Mission data watching functions now handled by MissionDataAPI
async function watchMissionDataChanges() {
    if (window.MissionDataAPI) {
        await window.MissionDataAPI.watchMissionDataChanges();
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
    if (window.MissionDataAPI) {
        await window.MissionDataAPI.reloadMissionDataFromFile();
    }
}

// Make it globally available
window.reloadMissionDataFromFile = reloadMissionDataFromFile; 

// WebSocket drone functions now handled by WebSocketDroneAPI
function initializeWebSocketDrone() {
    if (window.WebSocketDroneAPI) {
        window.WebSocketDroneAPI.initializeWebSocketDrone();
    } else {
        showNotification('WebSocket Drone API not loaded', 'error');
    }
}

function disconnectWebSocketDrone() {
    if (window.WebSocketDroneAPI) {
        window.WebSocketDroneAPI.disconnectWebSocketDrone();
    }
}

function resetDronePosition() {
    if (window.WebSocketDroneAPI) {
        window.WebSocketDroneAPI.resetDronePosition();
    }
}

// Add WebSocket drone functions to the global API
window.avionixisAPI.initializeWebSocketDrone = initializeWebSocketDrone;
window.avionixisAPI.disconnectWebSocketDrone = disconnectWebSocketDrone;
window.avionixisAPI.resetDronePosition = resetDronePosition; 