class DrawingTools {
    constructor(cesiumViewer, aiAgentInstance) {
        this.viewer = cesiumViewer;
        this.aiAgent = aiAgentInstance;
        this.isDrawing = false;
        this.currentTool = null;
        this.drawingHandler = null;
        this.activeEntity = null;
        this.activePoints = [];
        
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
                if (this.aiAgent && this.aiAgent.waypoints) {
                    const waypointIndex = this.aiAgent.waypoints.findIndex(w => w.entityId === pickedObject.id.id);
                    if (waypointIndex !== -1) {
                        const deletedWaypoint = this.aiAgent.waypoints[waypointIndex];
                        this.aiAgent.waypoints.splice(waypointIndex, 1);
                        
                        // Save waypoints to storage
                        await this.aiAgent.waypointStorage.saveWaypoints(this.aiAgent.waypoints);
                        
                        // Delete individual waypoint file
                        await this.aiAgent.deleteIndividualWaypointFile(deletedWaypoint.name);
                        
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
        this.aiAgent.currentPolygon = {
            entity: this.activeEntity,
            positions: this.activePoints.slice(),
            type: this.currentTool
        };
        
        // Emit drawing completed event for synchronization (disabled for now)
        // this.emitDrawingEvent('drawingCompleted', this.aiAgent.currentPolygon);
        
        // Automatically save waypoint with default name
        this.aiAgent.saveCurrentWaypointAuto();
        
        // Add success message
        if (this.aiAgent) {
            this.aiAgent.addAIMessage(`✅ Shape completed and saved as waypoint! Drawing tool deactivated.`);
        }
        
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

        // Clear waypoints from AI agent
        if (this.aiAgent) {
            this.aiAgent.waypoints = [];
            this.aiAgent.saveWaypoints();
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
}

// Set up global keyboard listener
document.addEventListener('keydown', (event) => {
    if (window.drawingToolsInstance) {
        window.drawingToolsInstance.handleKeydown(event);
    }
});

// Export for global access
window.DrawingTools = DrawingTools; 