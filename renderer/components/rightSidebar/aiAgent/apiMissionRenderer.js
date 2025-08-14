class ApiMissionRenderer {
    constructor() {
        this.viewer = null;
        this.renderedEntityIds = new Set();
        this.aiAgent = null;
    }

    // Set reference to AI Agent for message handling
    setAIAgent(aiAgentInstance) {
        this.aiAgent = aiAgentInstance;
    }

    // API communication methods
    async sendToAPI(command) {
        if (!window.AIAgentAPI) {
            this.addAIMessage('API not available');
            return;
        }

        try {
            const result = await window.AIAgentAPI.sendCommand(command);
            if (result.success) {
                this.addAIMessage(`✅ Command sent: "${command}"`);
                if (result.data) {
                    this.addAIMessage(`Response: ${JSON.stringify(result.data)}`);

                    // Save mission JSON to cache and renderer if mission is present
                    try {
                        console.log('🔥 Attempting to FORCE save mission data from regular API call...', result.data);
                        if (window.MissionDataAPI?.forceSaveMissionData) {
                            console.log('🔥 MissionDataAPI.forceSaveMissionData exists, calling it...');
                            await window.MissionDataAPI.forceSaveMissionData(result.data);
                        } else if (window.MissionDataAPI?.saveMissionDataFromApi) {
                            console.log('🔥 Using regular saveMissionDataFromApi...');
                            await window.MissionDataAPI.saveMissionDataFromApi(result.data);
                        } else {
                            console.error('🔥 ERROR: No MissionDataAPI save functions available!');
                        }
                    } catch (e) {
                        console.error('🔥 Failed to persist mission data:', e);
                        console.error('🔥 Error stack:', e.stack);
                    }
                }
            } else {
                this.addAIMessage(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            this.addAIMessage(`❌ Error: ${error.message}`);
        }
    }

    async sendToAPIWithWaypoints(command, waypointData, droneName = null) {
        if (!window.AIAgentAPI) {
            this.addAIMessage('API not available');
            return;
        }

        try {
            const result = await window.AIAgentAPI.sendCommandWithWaypoints(command, waypointData, droneName);
            if (result.success) {
                this.addAIMessage(`✅ Command sent: "${command}"`);
                if (waypointData.length > 0) {
                    this.addAIMessage(`📍 Waypoints included: ${waypointData.length} waypoint(s)`);
                }
                if (droneName) {
                    this.addAIMessage(`🚁 Target drone: ${droneName}`);
                }
                
                if (result.data) {
                    this.addAIMessage(`Response: ${JSON.stringify(result.data)}`);
                    try {
                        // Render mission on map
                        this.renderFromApiResponse(result.data, { 
                            clearPrevious: true, 
                            flyTo: true,
                            selectedDrone: droneName
                        });
                        this.addAIMessage('🗺️ Rendered mission on map with drone context');
                        
                        // Also persist mission JSON for later viewing and auto-reload
                        console.log('🔥 Attempting to FORCE save mission data from waypoints API call...', result.data);
                        if (window.MissionDataAPI?.forceSaveMissionData) {
                            console.log('🔥 MissionDataAPI.forceSaveMissionData exists, calling it...');
                            await window.MissionDataAPI.forceSaveMissionData(result.data);
                        } else if (window.MissionDataAPI?.saveMissionDataFromApi) {
                            console.log('🔥 Using regular saveMissionDataFromApi...');
                            await window.MissionDataAPI.saveMissionDataFromApi(result.data);
                        } else {
                            console.error('🔥 ERROR: No MissionDataAPI save functions available!');
                        }
                    } catch (e) {
                        console.error('Failed to render mission on map:', e);
                        this.addAIMessage('⚠️ Could not render mission on map');
                    }
                }
            } else {
                this.addAIMessage(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            this.addAIMessage(`❌ Error: ${error.message}`);
        }
    }

    // Send message with context handling
    async sendMessage(message, contextWaypoints = [], contextDrones = []) {
        if (!message || !message.trim()) {
            this.addAIMessage('Please enter a message to send.');
            return;
        }

        console.log('📤 sendMessage called');
        console.log('📝 Message content:', message);
        console.log('📍 Context waypoints:', contextWaypoints);
        console.log('🚁 Context drones:', contextDrones);
        
        // Extract waypoint data for selected waypoints
        const waypointData = this.getWaypointDataForContext(contextWaypoints);
        console.log('🗺️ Waypoint data for API:', waypointData);
        
        // Prepare command with mode and model context
        let command = message;
        if (this.aiAgent?.selectedMode) {
            command = `[${this.aiAgent.selectedMode.toUpperCase()}] ${command}`;
        }
        if (this.aiAgent?.selectedModel && this.aiAgent.selectedModel !== 'auto') {
            command = `[${this.aiAgent.selectedModel.toUpperCase()}] ${command}`;
        }
        
        console.log('📡 Final command:', command);
        
        // Send to appropriate API endpoint
        if (waypointData.length > 0 || contextDrones.length > 0) {
            // Use the waypoint endpoint with optional drone data
            const primaryDrone = contextDrones.length > 0 ? contextDrones[0] : null;
            await this.sendToAPIWithWaypoints(command, waypointData, primaryDrone);
        } else {
            // Use the regular endpoint
            await this.sendToAPI(command);
        }
    }

    // Get waypoint data for API context
    getWaypointDataForContext(contextWaypointNames) {
        if (!this.aiAgent?.waypointStorage) {
            return [];
        }
        
        return this.aiAgent.waypointStorage.getWaypointDataForContext(contextWaypointNames);
    }

    // Get waypoint data for context (global function)
    static getWaypointDataForContext(contextWaypointNames) {
        if (window.apiMissionRenderer) {
            return window.apiMissionRenderer.getWaypointDataForContext(contextWaypointNames);
        }
        return [];
    }

    // Add AI message (delegate to AI Agent if available)
    addAIMessage(text) {
        if (this.aiAgent && this.aiAgent.addAIMessage) {
            this.aiAgent.addAIMessage(text);
        } else {
            console.log('AI Message:', text);
        }
    }

    // Send waypoints to backend
    async sendWaypointsToBackend(missionName, waypointsData, contextWaypoints = []) {
        if (!window.AIAgentAPI) {
            throw new Error('AIAgentAPI not available');
        }

        return await window.AIAgentAPI.sendWaypointsToBackend(
            missionName,
            waypointsData,
            contextWaypoints
        );
    }

    getViewer() {
        // Resolve Cesium viewer from globals each time to avoid stale refs
        const viewer = window.cesiumViewer || window.viewer || null;
        this.viewer = viewer;
        return viewer;
    }

    clearPrevious() {
        const viewer = this.getViewer();
        if (!viewer) return;
        for (const id of this.renderedEntityIds) {
            try {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            } catch (_) {}
        }
        this.renderedEntityIds.clear();
    }

    renderFromApiResponse(apiData, options = {}) {
        const viewer = this.getViewer();
        if (!viewer || typeof Cesium === 'undefined') {
            console.warn('Cesium viewer not available; cannot render mission.');
            return;
        }

        const { clearPrevious = true, flyTo = true } = options;
        if (clearPrevious) this.clearPrevious();

        const createdEntities = [];

        // 1) Render the requested area (top-level waypoints polygon/square/circle)
        try {
            if (Array.isArray(apiData?.waypoints) && apiData.waypoints.length > 0) {
                const area = apiData.waypoints[0];
                if (Array.isArray(area.coordinates) && area.coordinates.length >= 3) {
                    const positions = area.coordinates.map(c =>
                        Cesium.Cartesian3.fromDegrees(c.lon, c.lat, Number.isFinite(c.alt) ? c.alt : 0)
                    );

                    const areaId = `mission-area-${Date.now()}`;
                    const areaEntity = viewer.entities.add({
                        id: areaId,
                        name: area.name || 'Mission Area',
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy(positions),
                            material: Cesium.Color.ORANGE.withAlpha(0.2),
                            outline: true,
                            outlineColor: Cesium.Color.ORANGE,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                        }
                    });
                    this.renderedEntityIds.add(areaId);
                    createdEntities.push(areaEntity);
                }
            }
        } catch (err) {
            console.error('Failed to render mission area:', err);
        }

        // 2) Render generated coverage/path waypoints as a single polyline (performance-friendly)
        try {
            const fnEntry = Array.isArray(apiData?.executed_functions) ? apiData.executed_functions[0] : null;
            const payload = Array.isArray(fnEntry) ? fnEntry[1] : null;
            const generatedWaypoints = Array.isArray(payload?.waypoints) ? payload.waypoints : [];

            if (generatedWaypoints.length > 0) {
                const coordsArray = [];
                for (const wp of generatedWaypoints) {
                    const p = wp?.position;
                    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
                        const alt = Number.isFinite(p.alt) ? p.alt : 0;
                        coordsArray.push(p.lon, p.lat, alt);
                    }
                }

                if (coordsArray.length >= 3 * 2) { // at least two points
                    const polylineId = `mission-path-${Date.now()}`;
                    const polylineEntity = viewer.entities.add({
                        id: polylineId,
                        name: 'Mission Path',
                        polyline: {
                            positions: Cesium.Cartesian3.fromDegreesArrayHeights(coordsArray),
                            width: 10,
                            material: new Cesium.PolylineOutlineMaterialProperty({
                                color: Cesium.Color.CYAN,
                                outlineColor: Cesium.Color.BLACK,
                                outlineWidth: 3
                            }),
                            clampToGround: false
                        }
                    });
                    this.renderedEntityIds.add(polylineId);
                    createdEntities.push(polylineEntity);

                    // Mark start and end points for clarity
                    const startLon = coordsArray[0];
                    const startLat = coordsArray[1];
                    const startAlt = coordsArray[2];
                    const endLon = coordsArray[coordsArray.length - 3];
                    const endLat = coordsArray[coordsArray.length - 2];
                    const endAlt = coordsArray[coordsArray.length - 1];

                    const startId = `${polylineId}-start`;
                    const endId = `${polylineId}-end`;

                    const startEntity = viewer.entities.add({
                        id: startId,
                        position: Cesium.Cartesian3.fromDegrees(startLon, startLat, startAlt),
                        point: { pixelSize: 10, color: Cesium.Color.LIME },
                        label: {
                            text: 'Start',
                            font: '14px sans-serif',
                            fillColor: Cesium.Color.LIME,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            pixelOffset: new Cesium.Cartesian2(0, -20)
                        }
                    });

                    const endEntity = viewer.entities.add({
                        id: endId,
                        position: Cesium.Cartesian3.fromDegrees(endLon, endLat, endAlt),
                        point: { pixelSize: 10, color: Cesium.Color.RED },
                        label: {
                            text: 'End',
                            font: '14px sans-serif',
                            fillColor: Cesium.Color.RED,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            pixelOffset: new Cesium.Cartesian2(0, -20)
                        }
                    });

                    this.renderedEntityIds.add(startId);
                    this.renderedEntityIds.add(endId);
                    createdEntities.push(startEntity, endEntity);
                }
            }
        } catch (err) {
            console.error('Failed to render mission path:', err);
        }

        // 3) Fly to the rendered content
        try {
            if (flyTo && createdEntities.length > 0) {
                const targets = createdEntities.filter(Boolean);
                if (targets.length > 0) {
                    this.viewer.flyTo(targets, {
                        duration: 1.2
                    });
                }
            }
        } catch (err) {
            console.warn('FlyTo failed:', err);
        }
    }
}

// Export for global access
window.ApiMissionRenderer = ApiMissionRenderer;

// Global API functions for external access
window.sendToAPI = (command) => {
    if (window.apiMissionRenderer) {
        return window.apiMissionRenderer.sendToAPI(command);
    }
};

window.sendToAPIWithWaypoints = (command, waypointData, droneName) => {
    if (window.apiMissionRenderer) {
        return window.apiMissionRenderer.sendToAPIWithWaypoints(command, waypointData, droneName);
    }
};

window.sendMessage = (message, contextWaypoints, contextDrones) => {
    if (window.apiMissionRenderer) {
        return window.apiMissionRenderer.sendMessage(message, contextWaypoints, contextDrones);
    }
};

window.sendWaypointsToBackend = (missionName, waypointsData, contextWaypoints) => {
    if (window.apiMissionRenderer) {
        return window.apiMissionRenderer.sendWaypointsToBackend(missionName, waypointsData, contextWaypoints);
    }
};

window.getWaypointDataForContext = (contextWaypointNames) => {
    if (window.apiMissionRenderer) {
        return window.apiMissionRenderer.getWaypointDataForContext(contextWaypointNames);
    }
    return [];
};


