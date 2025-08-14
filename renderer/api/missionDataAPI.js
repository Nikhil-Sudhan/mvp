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

            // Detect overlapping waypoints and assign visual offsets
            const waypointGroups = new Map(); // Group waypoints by position
            mission.waypoints.forEach((waypoint, index) => {
                const key = `${waypoint.longitude}_${waypoint.latitude}_${waypoint.altitude}`;
                if (!waypointGroups.has(key)) {
                    waypointGroups.set(key, []);
                }
                waypointGroups.get(key).push({ waypoint, index });
            });

            // Add each waypoint with offset for overlapping ones
            mission.waypoints.forEach((waypoint, index) => {
                const key = `${waypoint.longitude}_${waypoint.latitude}_${waypoint.altitude}`;
                const group = waypointGroups.get(key);
                const indexInGroup = group.findIndex(item => item.index === index);
                
                // Apply small offset for overlapping waypoints
                let offsetLon = 0;
                let offsetLat = 0;
                if (group.length > 1) {
                    // Circular arrangement for overlapping waypoints
                    const angle = (indexInGroup / group.length) * 2 * Math.PI;
                    const offsetDistance = 0.0001; // Small degree offset (~11m)
                    offsetLon = Math.cos(angle) * offsetDistance;
                    offsetLat = Math.sin(angle) * offsetDistance;
                }
                
                const position = Cesium.Cartesian3.fromDegrees(
                    waypoint.longitude + offsetLon,
                    waypoint.latitude + offsetLat,
                    waypoint.altitude
                );
                
                waypointPositions.push(position);
                
                // Different colors for overlapping waypoints
                const colors = [Cesium.Color.CYAN, Cesium.Color.YELLOW, Cesium.Color.LIME, Cesium.Color.ORANGE];
                const waypointColor = group.length > 1 ? colors[indexInGroup % colors.length] : Cesium.Color.CYAN;
                
                const waypointEntity = window.viewer.entities.add({
                    id: waypoint.id,
                    position: position,
                    point: {
                        pixelSize: group.length > 1 ? 14 : 12, // Larger for overlapping
                        color: waypointColor,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 2,
                        heightReference: Cesium.HeightReference.NONE
                    },
                    label: {
                        text: `${waypoint.name}${group.length > 1 ? ` (${indexInGroup + 1}/${group.length})` : ''}\n${waypoint.altitude}m`,
                        font: '12pt sans-serif',
                        pixelOffset: new Cesium.Cartesian2(indexInGroup * 15 - ((group.length - 1) * 7.5), -40),
                        fillColor: waypointColor,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 1,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        scale: 0.8,
                        heightReference: Cesium.HeightReference.NONE
                    }
                });
                
                waypointEntities.push(waypointEntity);
            });

            // Function to create smooth 3D interpolated path between two points
            function createSmoothPath(startPoint, endPoint, segments = 20) {
                const interpolatedPoints = [];
                
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    
                    // Linear interpolation for longitude and latitude
                    const lon = startPoint.longitude + (endPoint.longitude - startPoint.longitude) * t;
                    const lat = startPoint.latitude + (endPoint.latitude - startPoint.latitude) * t;
                    
                    // Smooth altitude transition using cubic easing (ease-in-out)
                    const altDiff = endPoint.altitude - startPoint.altitude;
                    let altT;
                    if (Math.abs(altDiff) > 10) { // Only apply smooth curve for significant altitude changes
                        // Cubic ease-in-out for smooth altitude transition
                        altT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    } else {
                        altT = t; // Linear for small altitude changes
                    }
                    const alt = startPoint.altitude + altDiff * altT;
                    
                    interpolatedPoints.push(Cesium.Cartesian3.fromDegrees(lon, lat, alt));
                }
                
                return interpolatedPoints;
            }

            // Create a single, high-visibility path: HomeBase -> waypoints -> Drone
            if (waypointPositions.length >= 1) {
                const pathPositions = [];

                // Start from homeBase for complete flight path
                const homeBasePoint = {
                    longitude: mission.homeBase.longitude,
                    latitude: mission.homeBase.latitude,
                    altitude: mission.homeBase.altitude
                };

                let previousPoint = homeBasePoint;

                // Create smooth path from homeBase to first waypoint
                if (mission.waypoints.length > 0) {
                    const firstWaypoint = {
                        longitude: mission.waypoints[0].longitude,
                        latitude: mission.waypoints[0].latitude,
                        altitude: mission.waypoints[0].altitude
                    };
                    
                    const smoothPoints = createSmoothPath(previousPoint, firstWaypoint);
                    pathPositions.push(...smoothPoints);
                    previousPoint = firstWaypoint;
                }

                // Add smooth paths between consecutive waypoints
                for (let i = 1; i < mission.waypoints.length; i++) {
                    const currentWaypoint = {
                        longitude: mission.waypoints[i].longitude,
                        latitude: mission.waypoints[i].latitude,
                        altitude: mission.waypoints[i].altitude
                    };
                    
                    const smoothPoints = createSmoothPath(previousPoint, currentWaypoint);
                    // Skip first point to avoid duplication
                    pathPositions.push(...smoothPoints.slice(1));
                    previousPoint = currentWaypoint;
                }

                // Create smooth path from last waypoint to current drone position
                if (mission.waypoints.length > 0) {
                    const dronePoint = {
                        longitude: mission.drone.longitude,
                        latitude: mission.drone.latitude,
                        altitude: mission.drone.altitude
                    };
                    
                    const smoothPoints = createSmoothPath(previousPoint, dronePoint);
                    // Skip first point to avoid duplication
                    pathPositions.push(...smoothPoints.slice(1));
                }

                // Style from mission.flightPath if present
                const fp = mission.flightPath || {};
                const width = Number.isFinite(fp.width) ? fp.width : 8;

                function parseColor(nameOrHex) {
                    const n = (nameOrHex || '').toString().trim().toUpperCase();
                    if (n.startsWith('#') && /^#([0-9A-F]{3}){1,2}$/i.test(n)) {
                        // Simple hex parser (#RGB or #RRGGBB)
                        const hex = n.length === 4
                            ? '#' + n[1] + n[1] + n[2] + n[2] + n[3] + n[3]
                            : n;
                        const r = parseInt(hex.slice(1, 3), 16) / 255;
                        const g = parseInt(hex.slice(3, 5), 16) / 255;
                        const b = parseInt(hex.slice(5, 7), 16) / 255;
                        return new Cesium.Color(r, g, b, 1.0);
                    }
                    switch (n) {
                        case 'YELLOW': return Cesium.Color.YELLOW;
                        case 'ORANGE': return Cesium.Color.ORANGE;
                        case 'RED': return Cesium.Color.RED;
                        case 'GREEN': return Cesium.Color.LIME;
                        case 'BLUE': return Cesium.Color.ROYALBLUE;
                        case 'WHITE': return Cesium.Color.WHITE;
                        case 'BLACK': return Cesium.Color.BLACK;
                        case 'CYAN':
                        default: return Cesium.Color.CYAN;
                    }
                }

                const mainColor = parseColor(fp.color);
                const useGlow = typeof fp.glowPower === 'number' && fp.glowPower > 0;

                const material = useGlow
                    ? new Cesium.PolylineGlowMaterialProperty({
                          color: mainColor,
                          glowPower: Math.min(0.9, Math.max(0.05, fp.glowPower))
                      })
                    : new Cesium.PolylineOutlineMaterialProperty({
                          color: mainColor,
                          outlineColor: Cesium.Color.BLACK,
                          outlineWidth: 3
                      });

                window.viewer.entities.add({
                    id: 'flightPath_main',
                    polyline: {
                        positions: pathPositions,
                        width,
                        // Enable 3D flight path visualization with smooth altitude transitions
                        clampToGround: false,
                        material,
                        // Add depth test to ensure proper 3D rendering
                        depthFailMaterial: material
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

// Save mission data returned from API into cache and renderer, then refresh map
async function saveMissionDataFromApi(apiResponse) {
    console.log('🔥 DEBUG: saveMissionDataFromApi called with:', apiResponse);
    
    try {
        const fs = require('fs');
        const path = require('path');

        // Debug: Log the API response structure
        console.log('🔥 API Response keys:', Object.keys(apiResponse || {}));
        console.log('🔥 Looking for mission in:', {
            topLevel: !!apiResponse?.mission,
            waypoint_data: !!apiResponse?.waypoint_data?.mission,
            full_structure: JSON.stringify(apiResponse, null, 2)
        });

        // Accept either top-level mission or nested under waypoint_data.mission
        const mission = apiResponse?.mission || apiResponse?.waypoint_data?.mission;
        if (!mission) {
            console.error('🔥 ERROR: No mission found in API response!');
            window.avionixisAPI?.showNotification('API response missing mission data - check console', 'warning');
            return false;
        }

        console.log('🔥 Found mission data:', mission);
        const missionData = { mission };

        // Write to renderer/mission-data.json (used by Cesium loader)
        const rendererJsonPath = path.join(process.cwd(), 'renderer', 'mission-data.json');
        console.log('🔥 Writing to renderer path:', rendererJsonPath);
        fs.writeFileSync(rendererJsonPath, JSON.stringify(missionData, null, 2), 'utf8');

        // Also write to cache/mission-data.json as requested
        const cacheJsonPath = path.join(process.cwd(), 'cache', 'mission-data.json');
        console.log('🔥 Writing to cache path:', cacheJsonPath);
        fs.writeFileSync(cacheJsonPath, JSON.stringify(missionData, null, 2), 'utf8');

        console.log('🔥 Files written successfully! Triggering reload...');

        // Trigger immediate reload on the map
        await reloadMissionDataFromFile();

        window.avionixisAPI?.showNotification('Mission data saved and loaded on map', 'success');
        console.log('🔥 SUCCESS: Mission data saved and reloaded!');
        return true;
    } catch (error) {
        console.error('🔥 ERROR in saveMissionDataFromApi:', error);
        console.error('🔥 Error stack:', error.stack);
        window.avionixisAPI?.showNotification(`Failed to save mission data: ${error.message}`, 'error');
        return false;
    }
}

// Test function to verify file writing works
async function testSaveMissionData() {
    console.log('🔥 TESTING file write capabilities...');
    try {
        const fs = require('fs');
        const path = require('path');
        
        const testData = {
            mission: {
                name: `TEST Mission - ${new Date().toLocaleString()}`,
                location: "TEST Location",
                drone: {
                    name: "TEST Drone",
                    longitude: 77.7243,
                    latitude: 9.6212,
                    altitude: 100
                },
                waypoints: [{
                    id: "test_waypoint",
                    name: "Test Point",
                    longitude: 77.7243,
                    latitude: 9.6212,
                    altitude: 50
                }]
            }
        };
        
        const rendererPath = path.join(process.cwd(), 'renderer', 'mission-data.json');
        const cachePath = path.join(process.cwd(), 'cache', 'mission-data.json');
        
        console.log('🔥 Test writing to:', rendererPath);
        console.log('🔥 Test writing to:', cachePath);
        
        fs.writeFileSync(rendererPath, JSON.stringify(testData, null, 2), 'utf8');
        fs.writeFileSync(cachePath, JSON.stringify(testData, null, 2), 'utf8');
        
        console.log('🔥 TEST SUCCESSFUL! Files written.');
        await reloadMissionDataFromFile();
        return true;
    } catch (error) {
        console.error('🔥 TEST FAILED:', error);
        return false;
    }
}

// Force save function that bypasses all checks
async function forceSaveMissionData(apiResponse) {
    console.log('🔥 FORCE SAVE called with:', apiResponse);
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Force create mission data even if structure is weird
        let missionData;
        if (apiResponse.mission) {
            missionData = { mission: apiResponse.mission };
        } else if (apiResponse.waypoint_data?.mission) {
            missionData = { mission: apiResponse.waypoint_data.mission };
        } else {
            // Force create a mission from whatever we have
            missionData = {
                mission: {
                    name: `Force Created - ${new Date().toLocaleString()}`,
                    location: "Unknown",
                    drone: apiResponse.drone || {
                        name: "Unknown Drone",
                        longitude: 77.7243,
                        latitude: 9.6212,
                        altitude: 100
                    },
                    waypoints: apiResponse.waypoints || [],
                    rawApiData: apiResponse
                }
            };
        }
        
        const timestamp = new Date().toISOString();
        const rendererPath = path.join(process.cwd(), 'renderer', 'mission-data.json');
        const cachePath = path.join(process.cwd(), 'cache', 'mission-data.json');
        
        console.log('🔥 FORCE writing mission data:', JSON.stringify(missionData, null, 2));
        
        // Add timestamp to ensure file changes
        missionData.lastUpdated = timestamp;
        
        fs.writeFileSync(rendererPath, JSON.stringify(missionData, null, 2), 'utf8');
        fs.writeFileSync(cachePath, JSON.stringify(missionData, null, 2), 'utf8');
        
        console.log('🔥 FORCE SAVE COMPLETE! Reloading...');
        await reloadMissionDataFromFile();
        
        return true;
    } catch (error) {
        console.error('🔥 FORCE SAVE FAILED:', error);
        return false;
    }
}

// Expose saver after declaration to avoid hoisting issues
window.MissionDataAPI.saveMissionDataFromApi = saveMissionDataFromApi;
window.MissionDataAPI.testSaveMissionData = testSaveMissionData;
window.MissionDataAPI.forceSaveMissionData = forceSaveMissionData;