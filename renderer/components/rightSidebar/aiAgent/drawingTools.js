// Enhanced Drawing Tools Component for Cesium
class DrawingTools {
    constructor(cesiumViewer, aiAgentInstance) {
        this.viewer = cesiumViewer;
        this.aiAgent = aiAgentInstance;
        this.isDrawing = false;
        this.currentTool = null;
        this.drawingHandler = null;
        this.activeEntity = null;
        this.activePoints = [];
        this.drawnEntities = [];
        
        // Tool types
        this.tools = {
            POLYGON: 'polygon',
            SQUARE: 'square', 
            CIRCLE: 'circle',
            ERASE: 'erase'
        };
        
        // Drawing states
        this.drawingState = {
            IDLE: 'idle',
            DRAWING: 'drawing',
            ERASING: 'erasing'
        };
        this.currentState = this.drawingState.IDLE;
        
        this.init();
    }

    init() {
        this.setupEventHandlers();
        this.setupMapControlsEvents();
    }

    setupMapControlsEvents() {
        // Tool selection from map controls
        document.querySelectorAll('.draw-tool-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.selectTool(tool);
            });
        });

        // Clear all button from map controls
        const clearAllBtn = document.getElementById('clearAllTool');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                if (confirm('Clear all drawn shapes? This action cannot be undone.')) {
                    this.clearAllShapes();
                }
            });
        }
    }

    updateDrawingStatus(message, type = 'idle') {
        // Instead of updating a status div, we can show notifications or console messages
        console.log(`Drawing Status: ${message}`);
        
        // Optional: Show temporary tooltip or notification
        if (type === 'drawing' || type === 'erasing') {
            this.showTemporaryStatus(message);
        }
    }

    showTemporaryStatus(message) {
        // Create a temporary status overlay on the map
        const statusDiv = document.createElement('div');
        statusDiv.className = 'drawing-status-overlay';
        statusDiv.textContent = message;
        statusDiv.style.cssText = `
            position: absolute;
            top: 60px;
            right: 15px;
            background: rgba(45, 45, 45, 0.9);
            color: #cccccc;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 999;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(statusDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, 3000);
    }

    setupEventHandlers() {
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isDrawing) {
                if (e.key === 'Escape') {
                    this.cancelDrawing();
                } else if (e.key === 'Enter' && this.currentTool === this.tools.POLYGON) {
                    this.finishPolygon();
                }
            }
        });
    }

    selectTool(toolType) {
        // Stop current drawing if any
        if (this.isDrawing) {
            this.stopDrawing();
        }

        // Update UI - remove active class from all drawing tool buttons
        document.querySelectorAll('.draw-tool-btn, .clear-all-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected tool
        const selectedBtn = document.querySelector(`[data-tool="${toolType}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        this.currentTool = toolType;

        if (toolType === this.tools.ERASE) {
            this.startEraseMode();
        } else {
            this.startDrawing(toolType);
        }
    }

    startDrawing(toolType) {
        if (!this.viewer) {
            this.showError('Cesium viewer not available');
            return;
        }

        this.isDrawing = true;
        this.currentState = this.drawingState.DRAWING;
        this.activePoints = [];
        this.activeEntity = null;

        // Disable camera controls during drawing
        this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

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
        }

        this.updateStatus(`Drawing ${toolType}... Click to add points. Press Escape to cancel.`, 'drawing');
    }

    startPolygonDrawing() {
        this.drawingHandler.setInputAction((event) => {
            const pickedPosition = this.viewer.camera.pickEllipsoid(event.position, this.viewer.scene.globe.ellipsoid);
            if (pickedPosition) {
                this.activePoints.push(pickedPosition);
                
                if (this.activePoints.length === 1) {
                    this.activeEntity = this.viewer.entities.add({
                        polygon: {
                            hierarchy: new Cesium.CallbackProperty(() => {
                                return new Cesium.PolygonHierarchy(this.activePoints);
                            }, false),
                            material: Cesium.Color.YELLOW.withAlpha(0.3),
                            outline: true,
                            outlineColor: Cesium.Color.YELLOW,
                            outlineWidth: 2,
                            height: 0
                        }
                    });
                }
                
                this.updateStatus(`Polygon: ${this.activePoints.length} points. Right-click to finish (min 3 points).`);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Right click to finish
        this.drawingHandler.setInputAction(() => {
            this.finishPolygon();
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }

    startSquareDrawing() {
        let startPoint = null;

        this.drawingHandler.setInputAction((event) => {
            const pickedPosition = this.viewer.camera.pickEllipsoid(event.position, this.viewer.scene.globe.ellipsoid);
            if (!pickedPosition) return;

            if (!startPoint) {
                startPoint = pickedPosition;
                this.updateStatus('Click second point to define square size...');
            } else {
                this.finishSquare(startPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Mouse move for preview
        this.drawingHandler.setInputAction((event) => {
            if (!startPoint) return;

            const pickedPosition = this.viewer.camera.pickEllipsoid(event.endPosition, this.viewer.scene.globe.ellipsoid);
            if (pickedPosition) {
                this.previewSquare(startPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    startCircleDrawing() {
        let centerPoint = null;

        this.drawingHandler.setInputAction((event) => {
            const pickedPosition = this.viewer.camera.pickEllipsoid(event.position, this.viewer.scene.globe.ellipsoid);
            if (!pickedPosition) return;

            if (!centerPoint) {
                centerPoint = pickedPosition;
                this.updateStatus('Click to set radius...');
            } else {
                this.finishCircle(centerPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Mouse move for preview
        this.drawingHandler.setInputAction((event) => {
            if (!centerPoint) return;

            const pickedPosition = this.viewer.camera.pickEllipsoid(event.endPosition, this.viewer.scene.globe.ellipsoid);
            if (pickedPosition) {
                this.previewCircle(centerPoint, pickedPosition);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    previewSquare(startPoint, endPoint) {
        if (this.activeEntity) {
            this.viewer.entities.remove(this.activeEntity);
        }

        const positions = this.createSquarePositions(startPoint, endPoint);
        this.activeEntity = this.viewer.entities.add({
            polygon: {
                hierarchy: positions,
                material: Cesium.Color.BLUE.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.BLUE,
                outlineWidth: 2,
                height: 0
            }
        });
    }

    previewCircle(centerPoint, edgePoint) {
        if (this.activeEntity) {
            this.viewer.entities.remove(this.activeEntity);
        }

        const radius = Cesium.Cartesian3.distance(centerPoint, edgePoint);
        const positions = this.createCirclePositions(centerPoint, radius);
        
        this.activeEntity = this.viewer.entities.add({
            polygon: {
                hierarchy: positions,
                material: Cesium.Color.GREEN.withAlpha(0.3),
                outline: true,
                outlineColor: Cesium.Color.GREEN,
                outlineWidth: 2,
                height: 0
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

    finishPolygon() {
        if (this.activePoints.length >= 3) {
            this.finishDrawing();
        } else {
            this.showError('Polygon needs at least 3 points');
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

        // Update entity with final styling
        this.activeEntity.polygon.material = Cesium.Color.CYAN.withAlpha(0.3);
        this.activeEntity.polygon.outlineColor = Cesium.Color.CYAN;

        // Store the entity for potential deletion
        this.drawnEntities.push({
            entity: this.activeEntity,
            points: this.activePoints.slice(),
            type: this.currentTool
        });

        // Show save modal
        this.aiAgent.currentPolygon = {
            entity: this.activeEntity,
            positions: this.activePoints.slice(),
            type: this.currentTool
        };
        
        this.aiAgent.showWaypointModal();
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
        this.currentState = this.drawingState.IDLE;
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
        document.querySelectorAll('.draw-tool').forEach(btn => {
            btn.classList.remove('active');
        });

        this.updateStatus('Click a tool to start drawing');
    }

    startEraseMode() {
        this.currentState = this.drawingState.ERASING;
        this.drawingHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

        this.drawingHandler.setInputAction((event) => {
            const pickedObject = this.viewer.scene.pick(event.position);
            if (pickedObject && pickedObject.id) {
                this.deleteShape(pickedObject.id);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        this.updateStatus('Click on shapes to erase them. Click another tool to exit erase mode.', 'erasing');
    }

    deleteShape(entity) {
        // Remove from Cesium
        this.viewer.entities.remove(entity);

        // Remove from drawn entities
        this.drawnEntities = this.drawnEntities.filter(item => item.entity !== entity);

        // Remove from waypoints if it's a saved waypoint
        if (this.aiAgent && this.aiAgent.waypoints) {
            const waypoint = this.aiAgent.waypoints.find(w => w.entityId === entity.id);
            if (waypoint) {
                this.aiAgent.waypoints = this.aiAgent.waypoints.filter(w => w.id !== waypoint.id);
                this.aiAgent.saveWaypoints();
                this.aiAgent.updateWaypointsList();
                this.aiAgent.addAIMessage(`Waypoint "${waypoint.name}" erased.`);
            }
        }

        this.showSuccess('Shape erased successfully');
    }

    toggleToolbar() {
        const toolbar = document.getElementById('drawing-toolbar');
        const content = toolbar.querySelector('.toolbar-content');
        const toggle = toolbar.querySelector('.toolbar-toggle i');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.className = 'fas fa-chevron-up';
        } else {
            content.style.display = 'none';
            toggle.className = 'fas fa-chevron-down';
        }
    }

    updateStatus(message, type = 'normal') {
        const statusElement = document.getElementById('drawing-status');
        if (statusElement) {
            // Remove existing status classes
            statusElement.classList.remove('drawing', 'erasing', 'success', 'error');
            
            // Add new status class based on type
            if (type === 'drawing') {
                statusElement.classList.add('drawing');
            } else if (type === 'erasing') {
                statusElement.classList.add('erasing');
            } else if (type === 'success') {
                statusElement.classList.add('success');
            } else if (type === 'error') {
                statusElement.classList.add('error');
            }
            
            statusElement.innerHTML = `<span>${message}</span>`;
        }
    }

    showError(message) {
        if (this.aiAgent && this.aiAgent.showError) {
            this.aiAgent.showError(message);
        }
    }

    showSuccess(message) {
        if (this.aiAgent && this.aiAgent.showNotification) {
            this.aiAgent.showNotification(message, 'success');
        }
    }

    // Public methods
    clearAllShapes() {
        const count = this.drawnEntities.length;
        this.drawnEntities.forEach(item => {
            this.viewer.entities.remove(item.entity);
        });
        this.drawnEntities = [];
        
        if (count > 0) {
            this.updateStatus(`Cleared ${count} shapes`, 'success');
            // Reset to normal status after 3 seconds
            setTimeout(() => {
                this.updateStatus('Click a tool to start drawing');
            }, 3000);
        } else {
            this.updateStatus('No shapes to clear', 'error');
            setTimeout(() => {
                this.updateStatus('Click a tool to start drawing');
            }, 2000);
        }
    }

    getDrawnShapes() {
        return this.drawnEntities.map(item => ({
            type: item.type,
            positions: item.points.map(pos => {
                const cartographic = Cesium.Cartographic.fromCartesian(pos);
                return {
                    longitude: Cesium.Math.toDegrees(cartographic.longitude),
                    latitude: Cesium.Math.toDegrees(cartographic.latitude),
                    height: cartographic.height || 0
                };
            })
        }));
    }
}

// Export for global access
window.DrawingTools = DrawingTools; 