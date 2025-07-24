// AI Agent Component
class AIAgent {
    constructor() {
        this.currentModel = 'online';
        this.selectedAutocompleteIndex = -1;
        this.drawingTools = null;
        this.waypointStorage = null;
        this.waypoints = [];
        
        // Legacy support
        this.isDrawing = false;
        this.drawingHandler = null;
        this.currentPolygon = null;
        
        // Initialize with error handling
        this.initWithErrorHandling();
    }

    async initWithErrorHandling() {
        try {
            await this.init();
        } catch (error) {
            console.error('AI Agent initialization error:', error);
            this.showError('AI Agent failed to initialize completely. Some features may not work.');
            
            // Still set up basic event listeners even if other parts fail
            this.setupBasicEventListeners();
        }
    }

    async init() {
        console.log('Initializing AI Agent...');
        
        try {
            this.setupEventListeners();
            this.updateModelStatus();
            
            // Initialize waypoint storage with error handling
            try {
                this.waypointStorage = new WaypointStorage();
                await this.loadWaypoints();
                console.log('Waypoint storage initialized successfully');
            } catch (error) {
                console.error('Failed to initialize waypoint storage:', error);
                this.waypointStorage = null;
                this.waypoints = [];
                this.showError('Waypoint storage failed to initialize. Using memory-only storage.');
            }
            
            // Initialize drawing tools when Cesium viewer is available
            this.initializeDrawingTools();
            
            this.updateWaypointsList();
            
            // Register with global API
            if (window.skyLoomAPI) {
                window.skyLoomAPI.registerComponent('aiAgent', this);
            }
            
            console.log('AI Agent initialized successfully');
        } catch (error) {
            console.error('Error during AI Agent initialization:', error);
            throw error;
        }
    }

    setupBasicEventListeners() {
        try {
            // Chat input and send - essential functionality
            const chatInput = document.getElementById('ai-chat-input');
            const sendBtn = document.getElementById('ai-send-btn');
            
            if (chatInput) {
                chatInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.sendBasicMessage();
                    }
                });
            }

            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    this.sendBasicMessage();
                });
            }
        } catch (error) {
            console.error('Error setting up basic event listeners:', error);
        }
    }

    sendBasicMessage() {
        try {
            const input = document.getElementById('ai-chat-input');
            if (!input) return;
            
            const message = input.value.trim();
            if (!message) return;
            
            this.addUserMessage(message);
            input.value = '';
            
            // Simple response without waypoint functionality
            setTimeout(() => {
                this.addAIMessage('I received your message. Some advanced features may not be available due to initialization issues.');
            }, 1000);
        } catch (error) {
            console.error('Error sending basic message:', error);
        }
    }

    initializeDrawingTools() {
        const checkViewer = () => {
            try {
                if (window.cesiumViewer && window.DrawingTools) {
                    this.drawingTools = new DrawingTools(window.cesiumViewer, this);
                    console.log('Drawing tools initialized successfully');
                } else {
                    // Cesium viewer not ready yet, try again in 500ms
                    setTimeout(checkViewer, 500);
                }
            } catch (error) {
                console.error('Failed to initialize drawing tools:', error);
                this.drawingTools = null;
                setTimeout(checkViewer, 1000); // Try again in 1 second
            }
        };
        
        checkViewer();
    }

    setupEventListeners() {
        try {
            // Model selection
            const modelOptions = document.querySelectorAll('.model-option');
            modelOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    this.switchModel(option.dataset.model);
                });
            });

            // Add waypoint button
            const addWaypointBtn = document.getElementById('add-waypoint-btn');
            if (addWaypointBtn) {
                addWaypointBtn.addEventListener('click', () => {
                    this.togglePolygonDrawing();
                });
            }

            // Chat input and send
            const chatInput = document.getElementById('ai-chat-input');
            const sendBtn = document.getElementById('ai-send-btn');
            
            if (chatInput) {
                chatInput.addEventListener('input', (e) => {
                    this.handleChatInput(e);
                });
                
                chatInput.addEventListener('keydown', (e) => {
                    this.handleChatKeydown(e);
                });
            }

            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    this.sendMessage();
                });
            }

            // Modal handlers
            const saveWaypointBtn = document.getElementById('save-waypoint');
            const cancelWaypointBtn = document.getElementById('cancel-waypoint');
            const waypointNameInput = document.getElementById('waypoint-name-input');

            if (saveWaypointBtn) {
                saveWaypointBtn.addEventListener('click', () => {
                    this.saveCurrentWaypoint();
                });
            }

            if (cancelWaypointBtn) {
                cancelWaypointBtn.addEventListener('click', () => {
                    this.cancelWaypointCreation();
                });
            }

            if (waypointNameInput) {
                waypointNameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.saveCurrentWaypoint();
                    }
                    if (e.key === 'Escape') {
                        this.cancelWaypointCreation();
                    }
                });
            }

            // Click outside modal to close
            const modal = document.getElementById('polygon-modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.cancelWaypointCreation();
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            throw error;
        }
    }

    switchModel(model) {
        try {
            this.currentModel = model;
            
            // Update UI
            document.querySelectorAll('.model-option').forEach(option => {
                option.classList.toggle('active', option.dataset.model === model);
            });
            
            this.updateModelStatus();
            
            // Add a chat message about the switch
            this.addAIMessage(`Switched to ${model === 'online' ? 'Online (Fast & Accurate)' : 'Offline (Slow & Less Accurate)'} model.`);
        } catch (error) {
            console.error('Error switching model:', error);
        }
    }

    updateModelStatus() {
        try {
            const statusText = document.getElementById('model-status-text');
            const statusIndicator = document.querySelector('.status-indicator');
            
            if (statusText && statusIndicator) {
                if (this.currentModel === 'online') {
                    statusText.textContent = 'Online Model Ready';
                    statusIndicator.classList.remove('offline');
                } else {
                    statusText.textContent = 'Offline Model Ready';
                    statusIndicator.classList.add('offline');
                }
            }
        } catch (error) {
            console.error('Error updating model status:', error);
        }
    }

    togglePolygonDrawing() {
        try {
            // Use new drawing tools if available, otherwise fallback to old method
            if (this.drawingTools) {
                this.drawingTools.selectTool('polygon');
            } else {
                const viewer = window.cesiumViewer;
                
                if (!viewer) {
                    this.showError('Map not available for drawing');
                    return;
                }

                if (this.isDrawing) {
                    this.stopPolygonDrawing();
                } else {
                    this.startPolygonDrawing();
                }
            }
        } catch (error) {
            console.error('Error toggling polygon drawing:', error);
            this.showError('Failed to start drawing mode');
        }
    }

    startPolygonDrawing() {
        try {
            const viewer = window.cesiumViewer;
            const addBtn = document.getElementById('add-waypoint-btn');
            
            if (!viewer) {
                this.showError('Map viewer not available');
                return;
            }
            
            this.isDrawing = true;
            if (addBtn) addBtn.classList.add('active');
            
            // Disable default camera controls during drawing
            viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
            
            // Start drawing polygon
            this.drawingHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            const activePoints = [];
            let activeEntity = null;

            this.drawingHandler.setInputAction((event) => {
                const pickedPosition = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
                if (pickedPosition) {
                    activePoints.push(pickedPosition);
                    
                    if (activePoints.length === 1) {
                        // Create the polygon entity
                        activeEntity = viewer.entities.add({
                            polygon: {
                                hierarchy: new Cesium.CallbackProperty(() => {
                                    return new Cesium.PolygonHierarchy(activePoints);
                                }, false),
                                material: Cesium.Color.YELLOW.withAlpha(0.3),
                                outline: true,
                                outlineColor: Cesium.Color.YELLOW,
                                outlineWidth: 2,
                                height: 0
                            }
                        });
                    }
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            // Right click to finish
            this.drawingHandler.setInputAction(() => {
                if (activePoints.length >= 3) {
                    this.currentPolygon = {
                        entity: activeEntity,
                        positions: activePoints.slice()
                    };
                    this.showWaypointModal();
                } else {
                    this.showError('Polygon needs at least 3 points');
                    if (activeEntity) {
                        viewer.entities.remove(activeEntity);
                    }
                }
                this.stopPolygonDrawing();
            }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

            // Add notification
            this.showNotification('Click to add points, right-click to finish polygon', 'info');
        } catch (error) {
            console.error('Error starting polygon drawing:', error);
            this.showError('Failed to start polygon drawing');
        }
    }

    stopPolygonDrawing() {
        try {
            this.isDrawing = false;
            const addBtn = document.getElementById('add-waypoint-btn');
            if (addBtn) addBtn.classList.remove('active');
            
            if (this.drawingHandler) {
                this.drawingHandler.destroy();
                this.drawingHandler = null;
            }
            
            // Re-enable default camera controls
            const viewer = window.cesiumViewer;
            if (viewer) {
                viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(() => {
                    viewer.homeButton.viewModel.command();
                }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
            }
        } catch (error) {
            console.error('Error stopping polygon drawing:', error);
        }
    }

    showWaypointModal() {
        try {
            const modal = document.getElementById('polygon-modal');
            const input = document.getElementById('waypoint-name-input');
            
            if (modal && input) {
                modal.style.display = 'flex';
                input.value = '';
                input.focus();
            }
        } catch (error) {
            console.error('Error showing waypoint modal:', error);
        }
    }

    async saveCurrentWaypoint() {
        try {
            const input = document.getElementById('waypoint-name-input');
            const modal = document.getElementById('polygon-modal');
            
            if (!input || !this.currentPolygon) return;
            
            const name = input.value.trim();
            if (!name) {
                this.showError('Please enter a waypoint name');
                return;
            }
            
            if (this.waypoints.find(w => w.name === name)) {
                this.showError('Waypoint name already exists');
                return;
            }

            // Create waypoint data with enhanced information
            const waypoint = {
                id: Date.now().toString(),
                name: name,
                type: this.currentPolygon.type || 'polygon',
                positions: this.currentPolygon.positions.map(pos => {
                    const cartographic = Cesium.Cartographic.fromCartesian(pos);
                    return {
                        longitude: Cesium.Math.toDegrees(cartographic.longitude),
                        latitude: Cesium.Math.toDegrees(cartographic.latitude),
                        height: cartographic.height || 0
                    };
                }),
                created: new Date().toISOString(),
                entityId: this.currentPolygon.entity.id,
                description: `${this.currentPolygon.type} waypoint created via drawing tools`,
                tags: [this.currentPolygon.type, 'waypoint', 'drawn'],
                metadata: {
                    pointCount: this.currentPolygon.positions.length,
                    area: this.calculateArea(this.currentPolygon.positions),
                    perimeter: this.calculatePerimeter(this.currentPolygon.positions)
                }
            };

            // Update the entity with proper styling and label
            this.currentPolygon.entity.polygon.material = Cesium.Color.CYAN.withAlpha(0.3);
            this.currentPolygon.entity.polygon.outlineColor = Cesium.Color.CYAN;
            this.currentPolygon.entity.label = {
                text: name,
                font: '12pt sans-serif',
                pixelOffset: new Cesium.Cartesian2(0, -30),
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE
            };

            // Save waypoint
            this.waypoints.push(waypoint);
            await this.saveWaypoints();
            this.updateWaypointsList();
            
            // Close modal
            if (modal) modal.style.display = 'none';
            
            // Add success message
            this.addAIMessage(`${waypoint.type.charAt(0).toUpperCase() + waypoint.type.slice(1)} waypoint "${name}" created successfully! You can reference it with @${name}`);
            
            // Clear current polygon
            this.currentPolygon = null;
        } catch (error) {
            console.error('Error saving waypoint:', error);
            this.showError('Failed to save waypoint. Please try again.');
        }
    }

    calculateArea(positions) {
        // Simple area calculation for display purposes
        if (positions.length < 3) return 0;
        
        try {
            let area = 0;
            for (let i = 0; i < positions.length; i++) {
                const j = (i + 1) % positions.length;
                const cartI = Cesium.Cartographic.fromCartesian(positions[i]);
                const cartJ = Cesium.Cartographic.fromCartesian(positions[j]);
                area += cartI.longitude * cartJ.latitude - cartJ.longitude * cartI.latitude;
            }
            return Math.abs(area) / 2;
        } catch (error) {
            return 0;
        }
    }

    calculatePerimeter(positions) {
        if (positions.length < 2) return 0;
        
        try {
            let perimeter = 0;
            for (let i = 0; i < positions.length; i++) {
                const j = (i + 1) % positions.length;
                perimeter += Cesium.Cartesian3.distance(positions[i], positions[j]);
            }
            return perimeter;
        } catch (error) {
            return 0;
        }
    }

    cancelWaypointCreation() {
        const modal = document.getElementById('polygon-modal');
        const viewer = window.cesiumViewer;
        
        // Remove the polygon entity
        if (this.currentPolygon && this.currentPolygon.entity && viewer) {
            viewer.entities.remove(this.currentPolygon.entity);
        }
        
        // Close modal
        if (modal) modal.style.display = 'none';
        
        // Clear current polygon
        this.currentPolygon = null;
    }

    updateWaypointsList() {
        const waypointList = document.getElementById('waypoint-list');
        const emptyState = document.getElementById('empty-waypoints');
        
        if (!waypointList || !emptyState) return;
        
        // Clear current list (except template)
        const items = waypointList.querySelectorAll('.waypoint-item:not(.sample)');
        items.forEach(item => item.remove());
        
        if (this.waypoints.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }
        
        emptyState.style.display = 'none';
        
        // Add waypoint items
        this.waypoints.forEach(waypoint => {
            const template = waypointList.querySelector('.sample');
            const item = template.cloneNode(true);
            
            item.classList.remove('sample');
            item.style.display = 'flex';
            
            // Update waypoint info with type icon and enhanced display
            const waypointInfo = item.querySelector('.waypoint-info');
            const icon = waypointInfo.querySelector('i');
            const nameElement = item.querySelector('.waypoint-name');
            
            // Set appropriate icon based on type
            switch (waypoint.type) {
                case 'square':
                    icon.className = 'fas fa-square';
                    break;
                case 'circle':
                    icon.className = 'fas fa-circle';
                    break;
                case 'polygon':
                default:
                    icon.className = 'fas fa-draw-polygon';
                    break;
            }
            
            // Enhanced name display with type
            nameElement.innerHTML = `
                <div class="waypoint-main-name">${waypoint.name}</div>
                <div class="waypoint-type">${waypoint.type} • ${waypoint.positions.length} points</div>
            `;
            
            // Add event listeners
            const viewBtn = item.querySelector('.waypoint-action:not(.delete)');
            const deleteBtn = item.querySelector('.waypoint-action.delete');
            
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    this.zoomToWaypoint(waypoint);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteWaypoint(waypoint);
                });
            }
            
            waypointList.appendChild(item);
        });
    }

    zoomToWaypoint(waypoint) {
        const viewer = window.cesiumViewer;
        if (!viewer) return;
        
        const entity = viewer.entities.getById(waypoint.entityId);
        if (entity) {
            viewer.flyTo(entity, {
                duration: 2.0,
                offset: new Cesium.HeadingPitchRange(0, -0.5, 1000)
            });
        }
    }

    async deleteWaypoint(waypoint) {
        if (!confirm(`Delete waypoint "${waypoint.name}"?`)) return;
        
        const viewer = window.cesiumViewer;
        
        // Remove from Cesium
        if (viewer) {
            const entity = viewer.entities.getById(waypoint.entityId);
            if (entity) {
                viewer.entities.remove(entity);
            }
        }
        
        // Remove from waypoints array
        this.waypoints = this.waypoints.filter(w => w.id !== waypoint.id);
        await this.saveWaypoints();
        this.updateWaypointsList();
        
        this.addAIMessage(`${waypoint.type.charAt(0).toUpperCase() + waypoint.type.slice(1)} waypoint "${waypoint.name}" deleted.`);
    }

    handleChatInput(event) {
        const input = event.target;
        const value = input.value;
        const cursorPosition = input.selectionStart;
        
        // Check for @ symbol for autocomplete
        const textBeforeCursor = value.substring(0, cursorPosition);
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        
        if (atMatch) {
            this.showAutocomplete(atMatch[1], cursorPosition);
        } else {
            this.hideAutocomplete();
        }
    }

    handleChatKeydown(event) {
        const dropdown = document.getElementById('autocomplete-dropdown');
        
        if (dropdown.style.display === 'block') {
            const items = dropdown.querySelectorAll('.autocomplete-item');
            
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.selectedAutocompleteIndex = Math.min(
                    this.selectedAutocompleteIndex + 1,
                    items.length - 1
                );
                this.updateAutocompleteSelection();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.selectedAutocompleteIndex = Math.max(
                    this.selectedAutocompleteIndex - 1,
                    -1
                );
                this.updateAutocompleteSelection();
            } else if (event.key === 'Enter' && this.selectedAutocompleteIndex >= 0) {
                event.preventDefault();
                items[this.selectedAutocompleteIndex].click();
            } else if (event.key === 'Escape') {
                this.hideAutocomplete();
            }
        } else if (event.key === 'Enter') {
            event.preventDefault();
            this.sendMessage();
        }
    }

    showAutocomplete(query, cursorPosition) {
        const dropdown = document.getElementById('autocomplete-dropdown');
        const input = document.getElementById('ai-chat-input');
        
        if (!dropdown || !input) return;
        
        // Filter waypoints by query
        const filteredWaypoints = this.waypoints.filter(waypoint =>
            waypoint.name.toLowerCase().includes(query.toLowerCase())
        );
        
        if (filteredWaypoints.length === 0) {
            this.hideAutocomplete();
            return;
        }
        
        // Clear dropdown
        dropdown.innerHTML = '';
        
        // Add waypoint items
        filteredWaypoints.forEach((waypoint, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <span>${waypoint.name}</span>
            `;
            
            item.addEventListener('click', () => {
                this.insertWaypointReference(waypoint.name, cursorPosition);
                this.hideAutocomplete();
            });
            
            dropdown.appendChild(item);
        });
        
        dropdown.style.display = 'block';
        this.selectedAutocompleteIndex = -1;
    }

    updateAutocompleteSelection() {
        const items = document.querySelectorAll('.autocomplete-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedAutocompleteIndex);
        });
    }

    hideAutocomplete() {
        const dropdown = document.getElementById('autocomplete-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        this.selectedAutocompleteIndex = -1;
    }

    insertWaypointReference(waypointName, cursorPosition) {
        const input = document.getElementById('ai-chat-input');
        if (!input) return;
        
        const value = input.value;
        const textBeforeCursor = value.substring(0, cursorPosition);
        const textAfterCursor = value.substring(cursorPosition);
        
        // Find the @ symbol position
        const atMatch = textBeforeCursor.match(/@(\w*)$/);
        if (atMatch) {
            const atPosition = textBeforeCursor.lastIndexOf('@');
            const newValue = 
                value.substring(0, atPosition) + 
                `@${waypointName}` + 
                textAfterCursor;
            
            input.value = newValue;
            const newCursorPosition = atPosition + waypointName.length + 1;
            input.setSelectionRange(newCursorPosition, newCursorPosition);
        }
    }

    sendMessage() {
        const input = document.getElementById('ai-chat-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        // Add user message
        this.addUserMessage(message);
        
        // Clear input
        input.value = '';
        this.hideAutocomplete();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Simulate AI response
        setTimeout(() => {
            this.hideTypingIndicator();
            this.generateAIResponse(message);
        }, 1000 + Math.random() * 2000);
    }

    addUserMessage(text) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <p>${this.formatMessageText(text)}</p>
                </div>
                <div class="message-time">${this.formatTime()}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addAIMessage(text) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message ai-message';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <p>${this.formatMessageText(text)}</p>
                </div>
                <div class="message-time">${this.formatTime()}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessageText(text) {
        // Replace @waypoint references with styled spans
        return text.replace(/@(\w+)/g, (match, waypoint) => {
            const waypointExists = this.waypoints.find(w => w.name === waypoint);
            const className = waypointExists ? 'waypoint-ref valid' : 'waypoint-ref invalid';
            return `<span class="${className}" data-waypoint="${waypoint}">${match}</span>`;
        });
    }

    formatTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'block';
            const messagesContainer = document.getElementById('ai-chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    generateAIResponse(userMessage) {
        let response = '';
        
        // Check for waypoint references
        const waypointRefs = userMessage.match(/@(\w+)/g);
        if (waypointRefs) {
            const validRefs = waypointRefs.filter(ref => {
                const waypointName = ref.substring(1);
                return this.waypoints.find(w => w.name === waypointName);
            });
            
            if (validRefs.length > 0) {
                response = `I see you're referencing ${validRefs.join(', ')}. `;
            }
        }
        
        // Simple AI responses based on content
        const lowerMessage = userMessage.toLowerCase();
        
        if (lowerMessage.includes('waypoint') || lowerMessage.includes('polygon')) {
            response += 'I can help you manage waypoints and polygon areas. You can draw new polygons on the map and reference them in our conversation using @waypoint-name.';
        } else if (lowerMessage.includes('fly') || lowerMessage.includes('mission')) {
            response += 'For flight planning, make sure to set up your waypoints first. I can help coordinate drone missions between different polygon areas.';
        } else if (lowerMessage.includes('help')) {
            response += 'I can assist with:\n• Managing polygon waypoints\n• Flight planning\n• Referencing areas with @waypoint-name\n• Mission coordination';
        } else {
            const responses = [
                'I understand. How can I help you with your drone operations?',
                'That\'s interesting. What would you like to do next?',
                'I\'m here to help with your flight planning and waypoint management.',
                'Let me know if you need help with polygon waypoints or mission planning.'
            ];
            response += responses[Math.floor(Math.random() * responses.length)];
        }
        
        this.addAIMessage(response);
    }

    async loadWaypoints() {
        try {
            if (this.waypointStorage) {
                this.waypoints = await this.waypointStorage.loadWaypoints();
            } else {
                // Fallback to localStorage if storage not initialized
                const saved = localStorage.getItem('skyloom-waypoints');
                this.waypoints = saved ? JSON.parse(saved) : [];
            }
            console.log(`Loaded ${this.waypoints.length} waypoints`);
        } catch (error) {
            console.error('Error loading waypoints:', error);
            this.waypoints = [];
            this.showError('Failed to load waypoints. Starting with empty list.');
        }
    }

    async saveWaypoints() {
        try {
            if (this.waypointStorage) {
                await this.waypointStorage.saveWaypoints(this.waypoints);
            } else {
                // Fallback to localStorage
                localStorage.setItem('skyloom-waypoints', JSON.stringify(this.waypoints));
            }
            console.log(`Saved ${this.waypoints.length} waypoints`);
        } catch (error) {
            console.error('Error saving waypoints:', error);
            this.showError('Failed to save waypoints. Changes may be lost.');
        }
    }

    showNotification(message, type = 'info') {
        try {
            if (window.skyLoomAPI && window.skyLoomAPI.showNotification) {
                window.skyLoomAPI.showNotification(message, type);
            } else {
                console.log(`Notification (${type}): ${message}`);
            }
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    showError(message) {
        try {
            this.showNotification(message, 'error');
        } catch (error) {
            console.error('Error showing error message:', error);
        }
    }
}

// Initialize AI Agent when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for cesium and other dependencies
    setTimeout(async () => {
        try {
            window.aiAgentInstance = new AIAgent();
            console.log('AI Agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI Agent:', error);
        }
    }, 1000);
});

// Export for global access
window.AIAgent = AIAgent; 