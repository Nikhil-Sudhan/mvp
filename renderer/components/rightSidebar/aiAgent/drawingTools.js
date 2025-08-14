class DrawingTools {
    constructor(cesiumViewer, aiAgentInstance) {
        this.viewer = cesiumViewer;
        this.aiAgent = aiAgentInstance;
        this.isDrawing = false;
        this.currentTool = null;
        this.drawingHandler = null;
        this.activeEntity = null;
        this.activePoints = [];
        
        // Waypoint modal management
        this.currentPolygon = null;
        
        // Tool types
        this.tools = {
            POLYGON: 'polygon',
            SQUARE: 'square',
            CIRCLE: 'circle',
            ERASE: 'erase'
        };
        
        this.init();
    }

    init() {
        this.setupMapControls();
        this.setupWaypointModalEvents();
    }

    setupMapControls() {
        // Listen for tool selection from map controls - only if not already set up
        if (!this.eventListenersSetup) {
            document.querySelectorAll('.draw-tool-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const tool = e.currentTarget.dataset.tool;
                    this.selectTool(tool);
                });
            });
            
            this.eventListenersSetup = true;
        }

        // Note: Clear all button is handled by MapControlsManager to avoid duplicates
    }

    setupWaypointModalEvents() {
        // Waypoint modal events
        const saveWaypointBtn = document.getElementById('save-waypoint');
        const cancelWaypointBtn = document.getElementById('cancel-waypoint');
        const waypointInput = document.getElementById('waypoint-input');

        if (saveWaypointBtn) {
            saveWaypointBtn.addEventListener('click', () => {
                this.saveCurrentWaypoint();
            });
        }

        if (cancelWaypointBtn) {
            cancelWaypointBtn.addEventListener('click', () => {
                this.hideWaypointModal();
            });
        }

        if (waypointInput) {
            waypointInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.saveCurrentWaypoint();
                } else if (e.key === 'Escape') {
                    this.hideWaypointModal();
                }
            });
        }
    }

    // Waypoint modal management methods
    showWaypointModal() {
        const modal = document.getElementById('waypoint-modal');
        const input = document.getElementById('waypoint-input');
        
        if (modal && input) {
            modal.style.display = 'flex';
            input.value = '';
            input.focus();
        }
    }

    hideWaypointModal() {
        const modal = document.getElementById('waypoint-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentPolygon = null;
    }

    async saveCurrentWaypoint() {
        const input = document.getElementById('waypoint-input');
        if (!input || !this.currentPolygon) return;

        const name = input.value.trim();
        if (!name) {
            if (this.aiAgent) {
                this.aiAgent.addAIMessage('Please enter a name for the waypoint.');
            }
            return;
        }

        try {
            // Create waypoint using storage
            const waypoint = await this.aiAgent.waypointStorage.createWaypoint(name, this.currentPolygon);
            
            // Update UI
            this.aiAgent.updateWaypointsList();
            
            // Hide modal
            this.hideWaypointModal();
            
            // Add success message
            if (this.aiAgent) {
                this.aiAgent.addAIMessage(`✅ Waypoint "${name}" saved successfully!`);
            }
            
        } catch (error) {
            console.error('Failed to save waypoint:', error);
            if (this.aiAgent) {
                this.aiAgent.addAIMessage(`❌ Failed to save waypoint: ${error.message}`);
            }
        }
    }

    // Ensure drawing tools are properly connected
    ensureDrawingToolsConnection() {
        // Check if map controls manager exists and has drawing tools
        if (window.mapControlsManager) {
            // Try to reinitialize drawing tools if they don't exist
            if (!window.mapControlsManager.drawingTools) {
                const success = window.mapControlsManager.reinitializeDrawingTools();
                if (success) {
                    console.log('✅ Drawing tools connected to AI Agent');
                    if (this.aiAgent) {
                        this.aiAgent.addAIMessage('🎨 Drawing tools are now ready! Click the drawing buttons to start creating waypoints.');
                    }
                } else {
                    console.warn('⚠️ Could not connect drawing tools to AI Agent');
                }
            } else {
                console.log('✅ Drawing tools already connected');
            }
        } else {
            console.warn('⚠️ Map controls manager not available');
        }
    }

    // Check if drawing tools are connected
    isConnected() {
        return window.mapControlsManager && window.mapControlsManager.drawingTools;
    }

    // Get drawing tools instance
    getInstance() {
        return window.mapControlsManager ? window.mapControlsManager.drawingTools : null;
    }

    selectTool(toolType) {
        // Stop current drawing
        if (this.isDrawing) {
            this.stopDrawing();
        }

        // Update UI - remove active from all buttons
        document.querySelectorAll('.draw-tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active to selected tool
        const selectedBtn = document.querySelector(`[data-tool="${toolType}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        this.currentTool = toolType;
        this.startDrawing(toolType);
    }

    startDrawing(toolType) {
        if (!this.viewer) {
            console.error('❌ Cesium viewer not available');
            return;
        }

        // Check if AI Agent is connected
        if (!this.aiAgent) {
            console.error('❌ AI Agent not connected to drawing tools');
            console.log('🔧 Attempting to fix connection...');
            
            // Try to get AI Agent instance
            if (window.aiAgentInstance) {
                this.aiAgent = window.aiAgentInstance;
                console.log('✅ AI Agent connection restored');
            } else {
                console.error('❌ AI Agent instance not available');
                return;
            }
        }

        this.isDrawing = true;
        this.activePoints = [];
        this.activeEntity = null;

        // Disable camera controls during drawing
        this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
            Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
        );

        this.drawingHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

        switch (toolType) {
            case this.tools.POLYGON:
                this.startPolygonDrawing();
                break;
            case this.tools.SQUARE:
                this.startSquareDrawing();
                break;
            case this.tools.CIRCLE:
                this.startCircleDrawing();
                break;
            case this.tools.ERASE:
                this.startEraseMode();
                break;
        }

        // Add status message
        if (this.aiAgent) {
            if (toolType === this.tools.ERASE) {
                this.aiAgent.addAIMessage(`🗑️ Erase mode - Click on shapes to remove them`);
            } else {
                this.aiAgent.addAIMessage(`🎨 Drawing ${toolType} - Left click to add points, Right click to finish/cancel`);
            }
        }

        console.log(`🎨 Started drawing ${toolType}`);
    }

    startPolygonDrawing() {
        this.drawingHandler.setInputAction((event) => {
            const pickedPosition = this.viewer.camera.pickEllipsoid(
                event.position, 
                this.viewer.scene.globe.ellipsoid
            );
            
            if (pickedPosition && Cesium.defined(pickedPosition)) {
                // Ensure we have valid coordinates
                if (isNaN(pickedPosition.x) || isNaN(pickedPosition.y) || isNaN(pickedPosition.z)) {
                    console.warn('Invalid position picked, skipping');
                    return;
                }
                
                this.activePoints.push(pickedPosition);
                
                if (this.activePoints.length === 1) {
                    // Create polygon entity with static hierarchy to prevent floating
                    this.activeEntity = this.viewer.entities.add({
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy([pickedPosition]),
                            material: Cesium.Color.YELLOW.withAlpha(0.3),
                            outline: true,
                            outlineColor: Cesium.Color.YELLOW,
                            outlineWidth: 2,
                            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            extrudedHeight: 0
                        }
                    });
                } else if (this.activeEntity && this.activePoints.length > 1) {
                    // Create a new hierarchy with all valid points
                    const validPoints = this.activePoints.filter(point => 
                        Cesium.defined(point) && 
                        !isNaN(point.x) && !isNaN(point.y) && !isNaN(point.z)
                    );
                    
                    if (validPoints.length >= 2) {
                        this.activeEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(validPoints);
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Right click to finish or cancel
        this.drawingHandler.setInputAction(() => {
            if (this.activePoints.length >= 3) {
                this.finishPolygon();
            } else {
                this.cancelDrawing();
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    startSquareDrawing() {
        let startPoint = null;

        this.drawingHandler.setInputAction((event) => {
            const pickedPosition = this.viewer.camera.pickEllipsoid(
                event.position, 
                this.viewer.scene.globe.ellipsoid
            );
            
            if (!pickedPosition) return;

            if (!startPoint) {
                startPoint = pickedPosition;
            } else {
                this.finishSquare(startPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Mouse move for preview
        this.drawingHandler.setInputAction((event) => {
            if (!startPoint) return;

            const pickedPosition = this.viewer.camera.pickEllipsoid(
                event.endPosition, 
                this.viewer.scene.globe.ellipsoid
            );
            
            if (pickedPosition) {
                this.previewSquare(startPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Right click to finish (if we have a start point) or cancel
        this.drawingHandler.setInputAction(() => {
            if (startPoint) {
                // Use a default size if only start point is set
                const endPoint = Cesium.Cartesian3.add(
                    startPoint,
                    new Cesium.Cartesian3(1000, 1000, 0),
                    new Cesium.Cartesian3()
                );
                this.finishSquare(startPoint, endPoint);
            } else {
                // Cancel drawing if no start point
                this.cancelDrawing();
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    startCircleDrawing() {
        let centerPoint = null;

        this.drawingHandler.setInputAction((event) => {
            const pickedPosition = this.viewer.camera.pickEllipsoid(
                event.position, 
                this.viewer.scene.globe.ellipsoid
            );
            
            if (!pickedPosition) return;

            if (!centerPoint) {
                centerPoint = pickedPosition;
            } else {
                this.finishCircle(centerPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Mouse move for preview
        this.drawingHandler.setInputAction((event) => {
            if (!centerPoint) return;

            const pickedPosition = this.viewer.camera.pickEllipsoid(
                event.endPosition, 
                this.viewer.scene.globe.ellipsoid
            );
            
            if (pickedPosition) {
                this.previewCircle(centerPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Right click to finish (if we have a center point) or cancel
        this.drawingHandler.setInputAction(() => {
            if (centerPoint) {
                // Use a default radius if only center point is set
                const edgePoint = Cesium.Cartesian3.add(
                    centerPoint,
                    new Cesium.Cartesian3(500, 0, 0),
                    new Cesium.Cartesian3()
                );
                this.finishCircle(centerPoint, edgePoint);
            } else {
                // Cancel drawing if no center point
                this.cancelDrawing();
            }
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    previewSquare(startPoint, endPoint) {
        const positions = this.createSquarePositions(startPoint, endPoint);
        
        if (this.activeEntity) {
            this.viewer.entities.remove(this.activeEntity);
        }
        
        this.activeEntity = this.viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(positions),
                material: Cesium.Color.BLUE.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.BLUE,
                outlineWidth: 2,
                height: 0,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                extrudedHeight: 0
            }
        });
    }

    previewCircle(centerPoint, edgePoint) {
        const radius = Cesium.Cartesian3.distance(centerPoint, edgePoint);
        const positions = this.createCirclePositions(centerPoint, radius);
        
        if (this.activeEntity) {
            this.viewer.entities.remove(this.activeEntity);
        }
        
        this.activeEntity = this.viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(positions),
                material: Cesium.Color.GREEN.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.GREEN,
                outlineWidth: 2,
                height: 0,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                extrudedHeight: 0
            }
        });
    }

    createSquarePositions(startPoint, endPoint) {
        const startCartographic = Cesium.Cartographic.fromCartesian(startPoint);
        const endCartographic = Cesium.Cartographic.fromCartesian(endPoint);
        
        const width = Math.abs(endCartographic.longitude - startCartographic.longitude);
        const height = width; // Make it a square
        
        const minLon = Math.min(startCartographic.longitude, endCartographic.longitude);
        const minLat = Math.min(startCartographic.latitude, endCartographic.latitude);
        
        return [
            Cesium.Cartesian3.fromRadians(minLon, minLat),
            Cesium.Cartesian3.fromRadians(minLon + width, minLat),
            Cesium.Cartesian3.fromRadians(minLon + width, minLat + height),
            Cesium.Cartesian3.fromRadians(minLon, minLat + height)
        ];
    }

    createCirclePositions(centerPoint, radius) {
        const positions = [];
        const segments = 64;
        
        const centerCartographic = Cesium.Cartographic.fromCartesian(centerPoint);
        const radiusRadians = radius / Cesium.Ellipsoid.WGS84.maximumRadius;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            const lon = centerCartographic.longitude + radiusRadians * Math.cos(angle);
            const lat = centerCartographic.latitude + radiusRadians * Math.sin(angle);
            positions.push(Cesium.Cartesian3.fromRadians(lon, lat));
        }
        
        return positions;
    }

    startEraseMode() {
        this.drawingHandler.setInputAction(async (event) => {
            const pickedObject = this.viewer.scene.pick(event.position);
            
            if (pickedObject && pickedObject.id && pickedObject.id.polygon) {
                // Remove the entity
                this.viewer.entities.remove(pickedObject.id);
                
                // Remove from waypoints if it exists
                if (this.aiAgent && this.aiAgent.waypointStorage) {
                    const waypoints = this.aiAgent.waypointStorage.getWaypoints();
                    const waypointIndex = waypoints.findIndex(w => w.entityId === pickedObject.id.id);
                    if (waypointIndex !== -1) {
                        const deletedWaypoint = waypoints[waypointIndex];
                        
                        // Delete waypoint using storage
                        await this.aiAgent.waypointStorage.deleteWaypoint(deletedWaypoint.id);
                        
                        // Update UI
                        this.aiAgent.updateWaypointsList();
                        
                        if (this.aiAgent) {
                            this.aiAgent.addAIMessage(`🗑️ Waypoint "${deletedWaypoint.name}" removed successfully`);
                        }
                    } else {
                        if (this.aiAgent) {
                            this.aiAgent.addAIMessage(`🗑️ Shape removed successfully`);
                        }
                    }
                }
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Right click to exit erase mode
        this.drawingHandler.setInputAction(() => {
            this.stopDrawing();
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    finishPolygon() {
        if (this.activePoints.length >= 3) {
            this.finishDrawing();
        } else {
            console.warn('Polygon needs at least 3 points');
            this.cancelDrawing();
        }
    }

    finishSquare(startPoint, endPoint) {
        this.activePoints = this.createSquarePositions(startPoint, endPoint);
        this.finishDrawing();
    }

    finishCircle(centerPoint, edgePoint) {
        const radius = Cesium.Cartesian3.distance(centerPoint, edgePoint);
        this.activePoints = this.createCirclePositions(centerPoint, radius);
        this.finishDrawing();
    }

    finishDrawing() {
        if (!this.activeEntity || this.activePoints.length === 0) {
            this.cancelDrawing();
            return;
        }

        // Update entity with final styling and fix hierarchy to prevent further updates
        this.activeEntity.polygon.material = Cesium.Color.CYAN.withAlpha(0.3);
        this.activeEntity.polygon.outlineColor = Cesium.Color.CYAN;
        this.activeEntity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
        this.activeEntity.polygon.extrudedHeight = 0;
        
        // Replace dynamic hierarchy with fixed hierarchy to prevent floating
        const finalPoints = this.activePoints.slice();
        this.activeEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(finalPoints);

        // Check if AI Agent is properly connected
        if (!this.aiAgent) {
            console.error('❌ AI Agent not connected to drawing tools');
            this.stopDrawing();
            return;
        }

        // Prepare for waypoint saving
        this.currentPolygon = {
            entity: this.activeEntity,
            positions: this.activePoints.slice(),
            type: this.currentTool
        };
        
        // Show waypoint modal for naming
        this.showWaypointModal();
        
        this.stopDrawing();
    }

    cancelDrawing() {
        if (this.activeEntity) {
            this.viewer.entities.remove(this.activeEntity);
        }
        this.stopDrawing();
    }

    stopDrawing() {
        this.isDrawing = false;
        this.activePoints = [];
        this.activeEntity = null;

        if (this.drawingHandler) {
            this.drawingHandler.destroy();
            this.drawingHandler = null;
        }

        // Re-enable camera controls
        if (this.viewer) {
            this.viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(() => {
                this.viewer.homeButton.viewModel.command();
            }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        }

        // Update UI
        document.querySelectorAll('.draw-tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Stopped drawing
    }

    clearAll() {
        // Remove all entities from the viewer
        const entitiesToRemove = [];
        this.viewer.entities.values.forEach(entity => {
            if (entity.polygon) {
                entitiesToRemove.push(entity);
            }
        });

        entitiesToRemove.forEach(entity => {
            this.viewer.entities.remove(entity);
        });

        // Clear waypoints from storage
        if (this.aiAgent && this.aiAgent.waypointStorage) {
            this.aiAgent.waypointStorage.clearAll();
            this.aiAgent.updateWaypointsList();
            this.aiAgent.addAIMessage(`Cleared all shapes and waypoints.`);
        }

        // Cleared shapes
    }

    // Keyboard shortcuts
    handleKeydown(event) {
        if (this.isDrawing) {
            if (event.key === 'Escape') {
                this.cancelDrawing();
            } else if (event.key === 'Enter' && this.currentTool === this.tools.POLYGON) {
                this.finishPolygon();
            }
        }
    }

    // Emit drawing events for synchronization (disabled for now)
    emitDrawingEvent(eventType, drawingData) {
        // Disabled to prevent crashes
        console.log(`📡 Drawing event emission disabled: ${eventType}`);
    }

    // =====================
    // Waypoint save helpers
    // =====================
    async saveWaypointWithName(name) {
        if (!this.aiAgent || !this.currentPolygon) return;

        const waypoints = this.aiAgent.waypointStorage.getWaypoints();
        const existingWaypoint = waypoints.find(w => w.name === name);
        if (existingWaypoint) {
            this.aiAgent.addAIMessage(`A waypoint named "${name}" already exists. Please choose a different name.`);
            return;
        }

        try {
            const coordinates = this.currentPolygon.positions.map(pos => {
                const cartographic = Cesium.Cartographic.fromCartesian(pos);
                return {
                    lat: Cesium.Math.toDegrees(cartographic.latitude),
                    lon: Cesium.Math.toDegrees(cartographic.longitude),
                    alt: cartographic.height || 100
                };
            });

            const waypoint = {
                id: Date.now().toString(),
                name: name,
                type: this.currentPolygon.type,
                coordinates: coordinates,
                created: new Date().toISOString(),
                entityId: this.currentPolygon.entity.id,
                description: `${this.currentPolygon.type} waypoint created via drawing tools`,
                tags: [this.currentPolygon.type, 'waypoint', 'drawn'],
                metadata: {
                    pointCount: coordinates.length,
                    area: this.calculateArea(coordinates),
                    perimeter: this.calculatePerimeter(coordinates)
                }
            };



            this.aiAgent.updateWaypointsList();
            this.aiAgent.addAIMessage(`✅ Waypoint "${name}" saved successfully!`);
        } catch (error) {
            console.error('Failed to save named waypoint:', error);
            this.aiAgent.addAIMessage(`❌ Failed to save waypoint: ${error.message}`);
        }
    }

    async saveCurrentWaypointAuto() {
        try {
            if (!this.activeEntity || !this.activePoints || this.activePoints.length === 0) {
                return;
            }



            // Generate default unique name
            const availableWaypoints = this.aiAgent?.waypointStorage?.getWaypoints() || [];
            const waypointCount = availableWaypoints.length + 1;
            const defaultName = `Waypoint#${waypointCount}`;
            let finalName = defaultName;
            let counter = 1;
            while (availableWaypoints.find(w => w.name === finalName)) {
                finalName = `Waypoint#${waypointCount + counter}`;
                counter++;
            }

            // Convert positions to lat/lon coordinates
            const coordinates = this.activePoints.map(pos => {
                const cartographic = Cesium.Cartographic.fromCartesian(pos);
                return {
                    lat: Cesium.Math.toDegrees(cartographic.latitude),
                    lon: Cesium.Math.toDegrees(cartographic.longitude),
                    alt: cartographic.height || 100
                };
            });

            // Unique id and duplicate check by entity id
            const uniqueId = `${Date.now()}_${this.activeEntity.id}`;
            const existingWaypoint = availableWaypoints.find(w => w.entityId === this.activeEntity.id);
            if (existingWaypoint) {
                return;
            }

            const waypoint = {
                id: uniqueId,
                name: finalName,
                type: this.currentTool,
                coordinates: coordinates,
                created: new Date().toISOString(),
                entityId: this.activeEntity.id,
                description: `${this.currentTool} waypoint created via drawing tools`,
                tags: [this.currentTool, 'waypoint', 'drawn'],
                metadata: {
                    pointCount: coordinates.length,
                    area: this.calculateArea(coordinates),
                    perimeter: this.calculatePerimeter(coordinates)
                }
            };

            // Append and persist
            if (this.aiAgent) {
                await this.aiAgent.waypointStorage.saveIndividualWaypointFile(waypoint);
                this.aiAgent.updateWaypointsList();
                this.aiAgent.updateTrackMissionWithAllWaypoints();
                this.aiAgent.addAIMessage(`✅ Waypoint "${finalName}" created automatically! Double-click the name to rename it.`);
                // Clear current polygon reference
                this.currentPolygon = null;
            }
        } catch (error) {
            console.error('Failed to auto-save waypoint:', error);
            if (this.aiAgent) {
                this.aiAgent.addAIMessage(`❌ Failed to save waypoint: ${error.message}`);
            }
        }
    }

    calculateArea(coordinates) {
        if (!coordinates || coordinates.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].lon * coordinates[j].lat;
            area -= coordinates[j].lon * coordinates[i].lat;
        }
        return Math.abs(area) / 2;
    }

    calculatePerimeter(coordinates) {
        if (!coordinates || coordinates.length < 2) return 0;
        let perimeter = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            const dx = coordinates[j].lon - coordinates[i].lon;
            const dy = coordinates[j].lat - coordinates[i].lat;
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        return perimeter;
    }
}

// Set up global keyboard listener
document.addEventListener('keydown', (event) => {
    if (window.drawingToolsInstance) {
        window.drawingToolsInstance.handleKeydown(event);
    }
});

// Export for global access
window.DrawingTools = DrawingTools;

// Global waypoint modal functions for external access
window.showWaypointModal = () => {
    if (window.drawingToolsInstance) {
        window.drawingToolsInstance.showWaypointModal();
    }
};

window.hideWaypointModal = () => {
    if (window.drawingToolsInstance) {
        window.drawingToolsInstance.hideWaypointModal();
    }
};

window.saveCurrentWaypoint = () => {
    if (window.drawingToolsInstance) {
        window.drawingToolsInstance.saveCurrentWaypoint();
    }
}; 