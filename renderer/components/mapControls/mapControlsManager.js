/**
 * Map Controls Manager
 * Handles all map control functionality including drawing tools, navigation, and layer management
 */
class MapControlsManager {
    constructor() {
        this.viewer = null;
        this.drawingTools = null;
        this.isInitialized = false;
        this.activeTool = null;
        this.controlButtons = {};
        this.layerManager = null;
        
        // Control states
        this.states = {
            isDrawing: false,
            isMeasuring: false,
            isFullscreen: false,
            currentLayer: 'satellite'
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Map Controls Manager...');
            
            // Wait for Cesium viewer to be available
            await this.waitForCesiumViewer();
            
            // Initialize components
            this.initializeControlButtons();
            this.initializeLayerManager();
            this.initializeDrawingTools();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            
            this.isInitialized = true;
            console.log('Map Controls Manager initialized successfully');
            
            // Show success notification
            if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                window.skyLoomAPI.showNotification('Map controls ready', 'success');
            }
            
        } catch (error) {
            console.error('Failed to initialize Map Controls Manager:', error);
            if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                window.skyLoomAPI.showNotification('Map controls failed to initialize', 'error');
            }
        }
    }

    async waitForCesiumViewer() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkViewer = () => {
                attempts++;
                
                // Check for viewer in multiple possible locations
                this.viewer = window.cesiumViewer || 
                             window.viewer || 
                             (window.skyLoomAPI && window.skyLoomAPI.getCesiumViewer && window.skyLoomAPI.getCesiumViewer());
                
                if (this.viewer && this.viewer.scene) {
                    console.log('Cesium viewer found and ready');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Cesium viewer not available after maximum attempts'));
                } else {
                    setTimeout(checkViewer, 100);
                }
            };
            
            checkViewer();
        });
    }

    initializeControlButtons() {
        // Map all control buttons
        this.controlButtons = {
            home: document.getElementById('homeBtn'),
            layers: document.getElementById('layersBtn'),
            measure: document.getElementById('measureBtn'),
            fullscreen: document.getElementById('fullscreenBtn'),
            polygon: document.getElementById('polygonTool'),
            square: document.getElementById('squareTool'),
            circle: document.getElementById('circleTool'),
            erase: document.getElementById('eraseTool'),
            clearAll: document.getElementById('clearAllTool')
        };

        // Verify all buttons exist
        const missingButtons = Object.entries(this.controlButtons)
            .filter(([name, element]) => !element)
            .map(([name]) => name);

        if (missingButtons.length > 0) {
            console.warn('Missing control buttons:', missingButtons);
        }
    }

    initializeLayerManager() {
        this.layerManager = {
            currentLayer: 'satellite',
            layers: {
                satellite: { assetId: 2, name: 'Satellite' },
                roads: { assetId: 3, name: 'Roads' },
                terrain: { assetId: 1, name: 'Terrain' }
            },
            
            switchLayer: (layerType) => {
                if (!this.viewer || !this.viewer.imageryLayers) {
                    console.error('Viewer or imagery layers not available');
                    return;
                }

                const layer = this.layerManager.layers[layerType];
                if (!layer) {
                    console.error(`Unknown layer type: ${layerType}`);
                    return;
                }

                try {
                    // Remove current layers
                    this.viewer.imageryLayers.removeAll();
                    
                    // Add new layer
                    this.viewer.imageryLayers.addImageryProvider(
                        new Cesium.IonImageryProvider({ assetId: layer.assetId })
                    );
                    
                    this.layerManager.currentLayer = layerType;
                    console.log(`Switched to ${layer.name} layer`);
                    
                    if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                        window.skyLoomAPI.showNotification(`Switched to ${layer.name} view`, 'info');
                    }
                } catch (error) {
                    console.error('Failed to switch layer:', error);
                    if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                        window.skyLoomAPI.showNotification('Failed to switch map layer', 'error');
                    }
                }
            }
        };
    }

    initializeDrawingTools() {
        // Initialize drawing tools if the class is available
        if (window.DrawingTools && this.viewer) {
            this.drawingTools = new window.DrawingTools(this.viewer, window.aiAgentInstance);
            console.log('Drawing tools initialized');
        } else {
            console.warn('Drawing tools not available');
        }
    }

    setupEventListeners() {
        // Home button
        if (this.controlButtons.home) {
            this.controlButtons.home.addEventListener('click', () => {
                this.goHome();
            });
        }

        // Layers button
        if (this.controlButtons.layers) {
            this.controlButtons.layers.addEventListener('click', () => {
                this.toggleLayers();
            });
        }

        // Measure button
        if (this.controlButtons.measure) {
            this.controlButtons.measure.addEventListener('click', () => {
                this.toggleMeasure();
            });
        }

        // Fullscreen button
        if (this.controlButtons.fullscreen) {
            this.controlButtons.fullscreen.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // Drawing tool buttons
        if (this.controlButtons.polygon) {
            this.controlButtons.polygon.addEventListener('click', () => {
                this.selectDrawingTool('polygon');
            });
        }

        if (this.controlButtons.square) {
            this.controlButtons.square.addEventListener('click', () => {
                this.selectDrawingTool('square');
            });
        }

        if (this.controlButtons.circle) {
            this.controlButtons.circle.addEventListener('click', () => {
                this.selectDrawingTool('circle');
            });
        }

        if (this.controlButtons.erase) {
            this.controlButtons.erase.addEventListener('click', () => {
                this.selectDrawingTool('erase');
            });
        }

        if (this.controlButtons.clearAll) {
            this.controlButtons.clearAll.addEventListener('click', () => {
                this.clearAll();
            });
        }

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts if not typing in input fields
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (event.key) {
                case 'h':
                case 'H':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.goHome();
                    }
                    break;
                case 'l':
                case 'L':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.toggleLayers();
                    }
                    break;
                case 'm':
                case 'M':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.toggleMeasure();
                    }
                    break;
                case 'f':
                case 'F':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.toggleFullscreen();
                    }
                    break;
                case 'Escape':
                    this.cancelCurrentTool();
                    break;
            }
        });
    }

    goHome() {
        if (!this.viewer) {
            console.error('Viewer not available');
            return;
        }

        try {
            // Try to fly to drone location first
            const droneEntity = this.viewer.entities.getById('mainDrone');
            if (droneEntity) {
                this.viewer.flyTo(droneEntity, {
                    duration: 2.0,
                    offset: new Cesium.HeadingPitchRange(0, -0.5, 2000)
                });
            } else {
                // Default home view
                this.viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(77.6843, 9.5812, 15000.0),
                    orientation: {
                        heading: 0.0,
                        pitch: -0.5,
                        roll: 0.0
                    }
                });
            }
            
            if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                window.skyLoomAPI.showNotification('Returned to home view', 'info');
            }
        } catch (error) {
            console.error('Failed to go home:', error);
        }
    }

    toggleLayers() {
        if (!this.layerManager) {
            console.error('Layer manager not available');
            return;
        }

        // Cycle through layers
        const layerOrder = ['satellite', 'roads', 'terrain'];
        const currentIndex = layerOrder.indexOf(this.layerManager.currentLayer);
        const nextIndex = (currentIndex + 1) % layerOrder.length;
        const nextLayer = layerOrder[nextIndex];

        this.layerManager.switchLayer(nextLayer);
        
        // Update button state
        if (this.controlButtons.layers) {
            this.controlButtons.layers.classList.toggle('active');
        }
    }

    toggleMeasure() {
        this.states.isMeasuring = !this.states.isMeasuring;
        
        if (this.states.isMeasuring) {
            if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                window.skyLoomAPI.showNotification('Measure tool activated - Click to start measuring', 'info');
            }
        } else {
            if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                window.skyLoomAPI.showNotification('Measure tool deactivated', 'info');
            }
        }
        
        // Update button state
        if (this.controlButtons.measure) {
            this.controlButtons.measure.classList.toggle('active');
        }
    }

    toggleFullscreen() {
        const centerContent = document.querySelector('.center-content');
        
        if (!centerContent) {
            console.error('Center content element not found');
            return;
        }

        if (!document.fullscreenElement) {
            centerContent.requestFullscreen().then(() => {
                this.states.isFullscreen = true;
                this.updateFullscreenButton();
                if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                    window.skyLoomAPI.showNotification('Entered fullscreen mode', 'info');
                }
            }).catch(err => {
                console.error('Could not enter fullscreen mode:', err);
                if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                    window.skyLoomAPI.showNotification('Could not enter fullscreen mode', 'error');
                }
            });
        } else {
            document.exitFullscreen().then(() => {
                this.states.isFullscreen = false;
                this.updateFullscreenButton();
                if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                    window.skyLoomAPI.showNotification('Exited fullscreen mode', 'info');
                }
            });
        }
    }

    updateFullscreenButton() {
        if (this.controlButtons.fullscreen) {
            const icon = this.controlButtons.fullscreen.querySelector('i');
            if (icon) {
                if (document.fullscreenElement) {
                    icon.className = 'fas fa-compress';
                    this.controlButtons.fullscreen.title = 'Exit Fullscreen';
                } else {
                    icon.className = 'fas fa-expand';
                    this.controlButtons.fullscreen.title = 'Fullscreen';
                }
            }
        }
    }

    selectDrawingTool(toolType) {
        // Cancel current tool first
        this.cancelCurrentTool();

        // Update UI
        document.querySelectorAll('.draw-tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const selectedBtn = document.querySelector(`[data-tool="${toolType}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        this.activeTool = toolType;

        // Handle different tool types
        switch (toolType) {
            case 'polygon':
            case 'square':
            case 'circle':
                if (this.drawingTools) {
                    this.drawingTools.selectTool(toolType);
                } else {
                    console.error('Drawing tools not available');
                }
                break;
            case 'erase':
                if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                    window.skyLoomAPI.showNotification('Erase tool selected - Click on shapes to remove', 'info');
                }
                break;
            default:
                console.warn(`Unknown tool type: ${toolType}`);
        }
    }

    cancelCurrentTool() {
        // Cancel drawing if active
        if (this.drawingTools && this.drawingTools.isDrawing) {
            this.drawingTools.cancelDrawing();
        }

        // Reset tool states
        this.activeTool = null;
        this.states.isMeasuring = false;

        // Update UI
        document.querySelectorAll('.draw-tool-btn, .map-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    clearAll() {
        if (confirm('Clear all drawn shapes? This cannot be undone.')) {
            if (this.drawingTools) {
                this.drawingTools.clearAll();
            } else {
                // Fallback: remove all polygon entities
                if (this.viewer) {
                    const entitiesToRemove = [];
                    this.viewer.entities.values.forEach(entity => {
                        if (entity.polygon) {
                            entitiesToRemove.push(entity);
                        }
                    });
                    entitiesToRemove.forEach(entity => {
                        this.viewer.entities.remove(entity);
                    });
                }
            }
            
            if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                window.skyLoomAPI.showNotification('Cleared all shapes', 'success');
            }
        }
    }

    // Public API methods
    getViewer() {
        return this.viewer;
    }

    getDrawingTools() {
        return this.drawingTools;
    }

    isReady() {
        return this.isInitialized && this.viewer !== null;
    }

    // Utility methods
    showError(message) {
        console.error(message);
        if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
            window.skyLoomAPI.showNotification(message, 'error');
        }
    }

    showSuccess(message) {
        if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
            window.skyLoomAPI.showNotification(message, 'success');
        }
    }
}

// Initialize the map controls manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other components to initialize
    setTimeout(() => {
        window.mapControlsManager = new MapControlsManager();
    }, 500);
});

// Export for global access
window.MapControlsManager = MapControlsManager; 