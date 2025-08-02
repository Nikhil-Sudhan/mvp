// Mission Data API Management
async function loadMissionData() {
    try {
        // Use more robust path resolution for Electron
        const missionDataUrl = new URL('mission-data.json', window.location.href).href;
        const response = await fetch(missionDataUrl);
        const missionData = await response.json();
        return missionData;
    } catch (error) {
        window.avionixisAPI?.showNotification('Failed to load mission data', 'error');
        return null;
    }
}

async function addMissionEntities() {
    if (!window.viewer) return;

    try {
        // Load mission data from JSON
        const missionData = await loadMissionData();
        if (!missionData) {
            window.avionixisAPI?.showNotification('No mission data available', 'error');
            return;
        }

        const mission = missionData.mission;

        // Add the drone from JSON data
        const droneEntity = window.viewer.entities.add({
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
                
                const waypointEntity = window.viewer.entities.add({
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
                const droneToFirstWaypoint = window.viewer.entities.add({
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
                    const flightPathEntity = window.viewer.entities.add({
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
                const lastWaypointToDrone = window.viewer.entities.add({
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

            window.avionixisAPI?.showNotification(`${mission.waypoints.length} waypoints and flight paths added`, 'success');
        }

        window.avionixisAPI?.showNotification(`Drone loaded: ${mission.drone.name}`, 'success');
        
        // Fly to the drone location with 3D perspective after a short delay
        setTimeout(() => {
            window.viewer.flyTo(droneEntity, {
                duration: 4.0,
                offset: new Cesium.HeadingPitchRange(
                    Cesium.Math.toRadians(45), // Angled heading
                    Cesium.Math.toRadians(-25), // Look down angle
                    1500 // Distance for good 3D perspective
                )
            });
        }, 2000);

    } catch (error) {
        window.avionixisAPI?.showNotification('Mission entities may not be visible', 'warning');
    }
}

// Add this function to watch for JSON file changes
async function watchMissionDataChanges() {
    if (!window.viewer) return;
    
    // Function to reload mission data and update map
    async function reloadMissionData() {
        try {
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
            
            window.avionixisAPI?.showNotification('Mission data updated from JSON file', 'success');
        } catch (error) {
            window.avionixisAPI?.showNotification('Failed to reload mission data', 'error');
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
        window.avionixisAPI?.showNotification('File watcher setup failed - manual reload may be needed', 'warning');
    }
}

// Manual reload function that can be called from the UI or keyboard shortcut
async function reloadMissionDataFromFile() {
    if (!window.viewer) {
        window.avionixisAPI?.showNotification('Map not ready for reload', 'error');
        return;
    }
    
    try {
        window.avionixisAPI?.showNotification('Reloading mission data...', 'info');
        
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
        
        window.avionixisAPI?.showNotification('Mission data reloaded manually', 'success');
    } catch (error) {
        window.avionixisAPI?.showNotification('Failed to reload mission data', 'error');
    }
}

// Export functions for global access
window.MissionDataAPI = {
    loadMissionData,
    addMissionEntities,
    watchMissionDataChanges,
    reloadMissionDataFromFile
}; 