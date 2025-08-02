// WebSocket Drone Management
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
    if (!window.viewer) {
        return;
    }

    // Create the initial drone entity
    websocketDrone = window.viewer.entities.add({
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
        window.viewer.flyTo(websocketDrone, {
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
}

function connectWebSocket() {
    try {
        websocketConnection = new WebSocket('ws://localhost:8000/ws');
        
        websocketConnection.onopen = function(event) {
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
                    window.avionixisAPI?.showNotification('Missing drone_status in data', 'warning');
                    return;
                }
                
                if (!droneData.drone_status.current_position) {
                    window.avionixisAPI?.showNotification('Missing current_position in drone_status', 'warning');
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
                    window.avionixisAPI?.showNotification('Invalid position coordinates received', 'error');
                    return;
                }
                
                // Check if position values are reasonable (not NaN or Infinity)
                if (!isFinite(currentPos.lat) || !isFinite(currentPos.lon) || !isFinite(currentPos.alt)) {
                    window.avionixisAPI?.showNotification('Invalid position numbers received', 'error');
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
                window.avionixisAPI?.showNotification('Error processing drone data: ' + error.message, 'error');
            }
        };
        
        websocketConnection.onclose = function(event) {
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (!websocketConnection || websocketConnection.readyState === WebSocket.CLOSED) {
                    connectWebSocket();
                }
            }, 3000);
        };
        
        websocketConnection.onerror = function(error) {
            // WebSocket connection error - silent handling
        };
        
    } catch (error) {
        // Failed to connect to drone WebSocket - silent handling
    }
}

function updateDronePositionFromReal(currentPos, deltaData, fullDroneData) {
    if (!websocketDrone) {
        // Try to create the drone entity if it doesn't exist
        initializeWebSocketDrone();
        return;
    }
    
    if (!window.viewer) {
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
        window.viewer.scene.requestRender();
        
        // If this is the first message, fly to the drone
        if (isFirstMessage) {
            setTimeout(() => {
                window.viewer.flyTo(websocketDrone, {
                    duration: 4.0,
                    offset: new Cesium.HeadingPitchRange(
                        Cesium.Math.toRadians(0),
                        Cesium.Math.toRadians(-45),
                        2000
                    )
                });
                isFirstMessage = false;
                window.avionixisAPI?.showNotification('Flying to drone location!', 'success');
            }, 500);
        }
        
    } catch (error) {
        window.avionixisAPI?.showNotification('Error updating drone position: ' + error.message, 'error');
        return;
    }
    
    // Update status bar with current altitude and mode
    window.avionixisAPI?.updateStatusBar('right', `Alt: ${dronePosition.alt.toFixed(1)}m | ${fullDroneData.drone_status.mode}`);
    
    // Show success notification for first few updates
    if (messageCount <= 3) {
        window.avionixisAPI?.showNotification(`Drone position updated! (${messageCount}/${3})`, 'success');
    }
}

function disconnectWebSocketDrone() {
    if (websocketConnection) {
        websocketConnection.close();
        websocketConnection = null;
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
        window.viewer.flyTo(websocketDrone, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(0),
                Cesium.Math.toRadians(-45),
                2000
            )
        });
    }
    
    window.avionixisAPI?.showNotification('Drone position reset to actual coordinates', 'success');
    window.avionixisAPI?.updateStatusBar('right', `Alt: ${dronePosition.alt.toFixed(1)}m | MANUAL`);
}

// Export functions for global access
window.WebSocketDroneAPI = {
    initializeWebSocketDrone,
    disconnectWebSocketDrone,
    resetDronePosition,
    connectWebSocket,
    updateDronePositionFromReal
}; 