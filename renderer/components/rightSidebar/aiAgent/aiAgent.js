// Prevent redeclaration if already loaded
if (typeof AIAgent === 'undefined') {
    
class AIAgent {
    constructor() {
        this.droneCommandAPI = null;
        this.waypointStorage = null;
        this.waypoints = [];
        this.currentPolygon = null;
        this.selectedWaypoints = [];
        this.selectedMode = 'surveillance'; // Default mode
        this.selectedModel = 'auto'; // Default model
        this.saveInProgress = false; // Prevent duplicate saves
        
        // New properties for enhanced @ functionality
        this.selectedContextWaypoints = []; // List of waypoint names selected via @
        this.contextWaypointsContainer = null; // Reference to the context display area
        
        // Properties for waypoint suggestions dropdown
        this.waypointSuggestionsVisible = false;
        this.currentSuggestionsInput = null;
        this.currentSuggestionIndex = -1; // For keyboard navigation
        
        // Waypoint synchronization manager
        this.syncManager = null;
        
        // Force immediate setup with multiple retries
        this.initWithRetries();
    }

    async initWithRetries() {
        let retryCount = 0;
        const maxRetries = 10;
        
        const tryInit = async () => {
            try {
                await this.init();
                console.log('✅ AIAgent initialized successfully');
            } catch (error) {
                console.error(`❌ AIAgent init attempt ${retryCount + 1} failed:`, error);
                retryCount++;
                
                if (retryCount < maxRetries) {
                    console.log(`🔄 Retrying AIAgent initialization in 500ms... (${retryCount}/${maxRetries})`);
                    setTimeout(tryInit, 500);
                } else {
                    console.error('❌ AIAgent failed to initialize after maximum retries');
                }
            }
        };
        
        tryInit();
    }

    async init() {
        try {
            // Initialize API and storage
            this.droneCommandAPI = new DroneCommandAPI();
            this.waypointStorage = new WaypointStorage();
            
            // Load existing waypoints
            this.waypoints = await this.waypointStorage.loadWaypoints();
            console.log(`Loaded ${this.waypoints.length} waypoints from storage`);
            
            // Sync with individual JSON files to ensure consistency
            await this.syncWithIndividualFiles();
            
            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Set up event listeners
            this.setupEventListeners();
            
                    // Initialize simple waypoint synchronization
        this.syncManager = new SimpleWaypointSync(this);
            
            // Update waypoints list immediately
            this.updateWaypointsList();
            
            // Restore waypoints to the map
            await this.restoreWaypointsToMap();
            
            // Initialize default selections
            this.selectMode('surveillance');
            this.selectModel('auto');
            
            // Initialize start button state
            this.showStartButton();
            
            // Initialize context waypoints display
            this.initializeContextWaypointsDisplay();
            
            // Ensure drawing tools are connected
            this.ensureDrawingToolsConnection();
            
            console.log('✅ AIAgent initialization completed');
            
        } catch (error) {
            console.error('Failed to initialize AI Agent:', error);
            throw error;
        }
    }

    async waitForDOM() {
        return new Promise((resolve) => {
            const checkDOM = () => {
                const chatInput = document.getElementById('chat-input');
                const startButton = document.getElementById('start-button');
                const modeDropdownBtn = document.getElementById('mode-dropdown-btn');
                const modelDropdownBtn = document.getElementById('model-dropdown-btn');
                
                if (chatInput && startButton && modeDropdownBtn && modelDropdownBtn) {
                    console.log('✅ All required DOM elements found');
                    resolve();
                } else {
                    console.log('⏳ Waiting for DOM elements...', {
                        chatInput: !!chatInput,
                        startButton: !!startButton,
                        modeDropdownBtn: !!modeDropdownBtn,
                        modelDropdownBtn: !!modelDropdownBtn
                    });
                    setTimeout(checkDOM, 100);
                }
            };
            
            checkDOM();
        });
    }

    setupEventListeners() {
        console.log('🔧 Setting up AIAgent event listeners...');
        
        // Chat input - send on Enter
        const chatInput = document.getElementById('chat-input');
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');

        if (chatInput) {
            // Remove any existing listeners
            chatInput.replaceWith(chatInput.cloneNode(true));
            const newChatInput = document.getElementById('chat-input');
            
            // Enable the input
            newChatInput.disabled = false;
            newChatInput.readOnly = false;
            
            newChatInput.addEventListener('keydown', (e) => {
                console.log('Chat input keydown:', e.key);
                
                // Handle waypoint suggestions navigation
                if (this.waypointSuggestionsVisible) {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        this.navigateSuggestions(e.key);
                        return;
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        this.selectCurrentSuggestion();
                        return;
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.hideWaypointSuggestions();
                        return;
                    }
                }
                
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Enhanced @ functionality for text input
            newChatInput.addEventListener('input', (e) => {
                this.handleTextInput(e);
                this.updateStartButtonState();
            });
            
            // Chat input listeners attached
        } else {
            console.error('❌ Chat input element not found');
        }

        // Start button - send message
        if (startButton) {
            // Remove any existing listeners
            startButton.replaceWith(startButton.cloneNode(true));
            const newStartButton = document.getElementById('start-button');
            
            newStartButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Start button clicked!');
                this.sendMessage();
            });
            
            // Start button event listener attached
        } else {
            console.error('❌ Start button element not found');
        }

        // Stop button - stop current operation
        if (stopButton) {
            stopButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Stop button clicked!');
                this.stopCurrentOperation();
            });
        }

        // Context button
        const contextButton = document.getElementById('context-button');
        const contextDropdown = document.getElementById('context-dropdown');
        
        if (contextButton) {
            contextButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Context button clicked!');
                
                // Show waypoint suggestions dropdown instead of context dropdown
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    this.showWaypointSuggestions(chatInput, chatInput.value.length);
                }
            });
        }

        // Close context dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (contextDropdown && !contextButton?.contains(e.target) && !contextDropdown.contains(e.target)) {
                this.hideContextDropdown();
            }
        });

        // Mode dropdown
        const modeDropdownBtn = document.getElementById('mode-dropdown-btn');
        const modeDropdownMenu = document.getElementById('mode-dropdown-menu');
        
        if (modeDropdownBtn) {
            modeDropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Mode dropdown clicked!');
                this.toggleModeDropdown();
            });
        }

        // Mode dropdown items
        const modeDropdownItems = document.querySelectorAll('.mode-item');
        modeDropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Mode item clicked:', item.dataset.mode);
                this.selectMode(item.dataset.mode);
            });
        });

        // Close mode dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (modeDropdownMenu && !modeDropdownBtn?.contains(e.target) && !modeDropdownMenu.contains(e.target)) {
                this.hideModeDropdown();
            }
        });

        // Model dropdown
        const modelDropdownBtn = document.getElementById('model-dropdown-btn');
        const modelDropdownMenu = document.getElementById('model-dropdown-menu');
        
        if (modelDropdownBtn) {
            modelDropdownBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Model dropdown clicked!');
                this.toggleModelDropdown();
            });
        }

        // Model dropdown items
        const modelDropdownItems = document.querySelectorAll('.model-item');
        modelDropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Model item clicked:', item.dataset.model);
                this.selectModel(item.dataset.model);
            });
        });

        // Close model dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (modelDropdownMenu && !modelDropdownBtn?.contains(e.target) && !modelDropdownMenu.contains(e.target)) {
                this.hideModelDropdown();
            }
        });

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

        // Save waypoints when app closes
        window.addEventListener('beforeunload', async (e) => {
            if (this.waypointStorage && this.waypoints.length > 0) {
                try {
                    await this.waypointStorage.saveWaypoints(this.waypoints);
                    console.log('Waypoints saved before app close');
                } catch (error) {
                    console.error('Failed to save waypoints before app close:', error);
                }
            }
        });
        
        // Add click outside listener for waypoint suggestions
        document.addEventListener('click', (e) => {
            if (this.waypointSuggestionsVisible) {
                const suggestionsDropdown = document.getElementById('waypoint-suggestions-dropdown');
                if (suggestionsDropdown && !suggestionsDropdown.contains(e.target) && 
                    this.currentSuggestionsInput && !this.currentSuggestionsInput.contains(e.target)) {
                    this.hideWaypointSuggestions();
                }
            }
        });
        
        // All event listeners set up
    }



    async sendMessage() {
        console.log('📤 sendMessage called');
        
        const input = document.getElementById('chat-input');
        if (!input) {
            console.error('❌ Chat input element not found in sendMessage');
            return;
        }
        
        const message = input.value.trim();
        console.log('📝 Message content:', message);
        
        if (!message) {
            console.log('⚠️ Empty message, not sending');
            return;
        }
        
        console.log('🚀 Sending message:', message);
        
        // Switch to stop button
        this.showStopButton();
        
        // Add user message
        this.addUserMessage(message);
        
        // Clear input
        input.value = '';
        
        // Get selected context waypoints
        const contextWaypoints = this.getSelectedContextWaypoints();
        console.log('📍 Context waypoints:', contextWaypoints);
        
        // Extract waypoint data for selected waypoints
        const waypointData = this.getWaypointDataForContext(contextWaypoints);
        console.log('🗺️ Waypoint data for API:', waypointData);
        
        // Prepare command with mode and model context
        let command = message;
        if (this.selectedMode) {
            command = `[${this.selectedMode.toUpperCase()}] ${command}`;
        }
        if (this.selectedModel && this.selectedModel !== 'auto') {
            command = `[${this.selectedModel.toUpperCase()}] ${command}`;
        }
        
        console.log('📡 Final command:', command);
        
        // Send to appropriate API endpoint
        if (waypointData.length > 0) {
            // Use the new endpoint with waypoint data
            await this.sendToAPIWithWaypoints(command, waypointData);
        } else {
            // Use the regular endpoint
            await this.sendToAPI(command);
        }
        
        // Switch back to start button
        this.showStartButton();
    }

    showStartButton() {
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');
        
        if (startButton) {
            startButton.style.display = 'flex';
            startButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
        }
        
        if (stopButton) {
            stopButton.style.display = 'none';
        }
        
        // Update button state based on input
        this.updateStartButtonState();
    }

    showStopButton() {
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');
        
        if (startButton) {
            startButton.style.display = 'none';
        }
        
        if (stopButton) {
            stopButton.style.display = 'flex';
        }
    }

    updateStartButtonState() {
        const input = document.getElementById('chat-input');
        const startButton = document.getElementById('start-button');
        
        if (!input || !startButton) {
            console.error('❌ Elements not found in updateStartButtonState:', {
                input: !!input,
                startButton: !!startButton
            });
            return;
        }
        
        const hasText = input.value.trim().length > 0;
        console.log('🔄 Updating start button state:', {
            hasText,
            inputValue: input.value,
            trimmedLength: input.value.trim().length
        });
        
        startButton.disabled = !hasText;
        startButton.style.opacity = hasText ? '1' : '0.5';
        startButton.style.cursor = hasText ? 'pointer' : 'not-allowed';
        
        console.log('✅ Start button updated:', {
            disabled: startButton.disabled,
            opacity: startButton.style.opacity,
            cursor: startButton.style.cursor
        });
    }

    async sendToAPI(command) {
        if (!this.droneCommandAPI) {
            this.addAIMessage('API not available');
            return;
        }

        try {
            const result = await this.droneCommandAPI.sendCommand(command);
            
            if (result.success) {
                this.addAIMessage(`✅ Command sent: "${command}"`);
                if (result.data) {
                    this.addAIMessage(`Response: ${JSON.stringify(result.data)}`);
                }
            } else {
                this.addAIMessage(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            this.addAIMessage(`❌ Error: ${error.message}`);
        }
    }

    async sendToAPIWithWaypoints(command, waypointData) {
        if (!this.droneCommandAPI) {
            this.addAIMessage('API not available');
            return;
        }

        try {
            const result = await this.droneCommandAPI.sendCommandWithWaypoints(command, waypointData);
            
            if (result.success) {
                this.addAIMessage(`✅ Command with waypoints sent: "${command}"`);
                this.addAIMessage(`📍 Waypoints included: ${waypointData.length} waypoint(s)`);
                if (result.data) {
                    this.addAIMessage(`Response: ${JSON.stringify(result.data)}`);
                    try {
                        // Render mission response on Cesium map
                        if (!window.apiMissionRenderer) {
                            window.apiMissionRenderer = new ApiMissionRenderer();
                        }
                        window.apiMissionRenderer.renderFromApiResponse(result.data, { clearPrevious: true, flyTo: true });
                        this.addAIMessage('🗺️ Rendered mission on map');
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

    getWaypointDataForContext(contextWaypointNames) {
        const waypointData = [];
        
        contextWaypointNames.forEach(waypointName => {
            // Find the waypoint in our loaded waypoints
            const waypoint = this.waypoints.find(w => w.name === waypointName);
            if (waypoint) {
                // Extract the waypoint data for the API
                const apiWaypointData = {
                    id: waypoint.id,
                    name: waypoint.name,
                    type: waypoint.type,
                    coordinates: waypoint.coordinates,
                    description: waypoint.description,
                    tags: waypoint.tags,
                    metadata: waypoint.metadata
                };
                waypointData.push(apiWaypointData);
                console.log(`✅ Found waypoint data for "${waypointName}":`, apiWaypointData);
            } else {
                console.warn(`⚠️ Waypoint "${waypointName}" not found in loaded waypoints`);
            }
        });
        
        return waypointData;
    }

    addUserMessage(text) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${text}</div>
                <div class="message-time">${this.getFormattedTime()}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addAIMessage(text) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message ai-message';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${text}</div>
                <div class="message-time">${this.getFormattedTime()}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    getFormattedTime() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Waypoint management methods
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

    async saveCurrentWaypointAuto() {
        console.log('saveCurrentWaypointAuto called');
        if (!this.currentPolygon) {
            console.log('No current polygon found');
            return;
        }

        // Prevent duplicate saves
        if (this.currentPolygon.saved || this.saveInProgress) {
            console.log('Waypoint already saved or save in progress, skipping duplicate save');
            return;
        }

        try {
            // Mark as being saved to prevent duplicates
            this.currentPolygon.saved = true;
            this.saveInProgress = true;
            console.log('Creating waypoint...');
            // Generate default name
            const waypointCount = this.waypoints.length + 1;
            const defaultName = `Waypoint#${waypointCount}`;
            
            // Find a unique name if default already exists
            let finalName = defaultName;
            let counter = 1;
            while (this.waypoints.find(w => w.name === finalName)) {
                finalName = `Waypoint#${waypointCount + counter}`;
                counter++;
            }

            console.log(`Generated name: ${finalName}`);

            // Convert positions to lat/lon coordinates
            const coordinates = this.currentPolygon.positions.map(pos => {
                const cartographic = Cesium.Cartographic.fromCartesian(pos);
                return {
                    lat: Cesium.Math.toDegrees(cartographic.latitude),
                    lon: Cesium.Math.toDegrees(cartographic.longitude),
                    alt: cartographic.height || 100 // Default altitude
                };
            });

            console.log(`Converted ${coordinates.length} coordinates`);

            // Generate unique ID with entity ID to prevent duplicates
            const uniqueId = `${Date.now()}_${this.currentPolygon.entity.id}`;
            
            // Check if waypoint with this entity ID already exists
            const existingWaypoint = this.waypoints.find(w => w.entityId === this.currentPolygon.entity.id);
            if (existingWaypoint) {
                console.log('Waypoint with this entity already exists, skipping duplicate creation');
                return;
            }

            // Create waypoint object
            const waypoint = {
                id: uniqueId,
                name: finalName,
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

            console.log('Created waypoint object:', waypoint);

            // Add to waypoints array
            this.waypoints.push(waypoint);
            console.log(`Total waypoints: ${this.waypoints.length}`);
            
            // Emit waypoint created event for synchronization (disabled for now)
            // this.emitWaypointEvent('waypointCreated', waypoint);
            
            // Save to storage (collective waypoints file)
            await this.waypointStorage.saveWaypoints(this.waypoints);
            console.log('Saved to storage');
            
            // Save individual waypoint JSON file
            await this.saveIndividualWaypointFile(waypoint);
            console.log('Saved individual waypoint file');
            
            // Update UI
            console.log('Updating waypoints list...');
            this.updateWaypointsList();
            
            // Update track mission waypoints with all waypoints
            this.updateTrackMissionWithAllWaypoints();
            
            // Add success message
            this.addAIMessage(`✅ Waypoint "${finalName}" created automatically! Double-click the name to rename it.`);
            
            // Clear current polygon
            this.currentPolygon = null;
            
            console.log('Waypoint creation completed successfully');
            
        } catch (error) {
            console.error('Failed to save waypoint:', error);
            this.addAIMessage(`❌ Failed to save waypoint: ${error.message}`);
        } finally {
            // Reset save flag
            this.saveInProgress = false;
        }
    }

    async saveCurrentWaypoint() {
        const input = document.getElementById('waypoint-input');
        if (!input || !this.currentPolygon) return;

        const name = input.value.trim();
        if (!name) {
            this.addAIMessage('Please enter a name for the waypoint.');
            return;
        }

        // Check if name already exists
        const existingWaypoint = this.waypoints.find(w => w.name === name);
        if (existingWaypoint) {
            this.addAIMessage(`A waypoint named "${name}" already exists. Please choose a different name.`);
            return;
        }

        try {
            // Convert positions to lat/lon coordinates
            const coordinates = this.currentPolygon.positions.map(pos => {
                const cartographic = Cesium.Cartographic.fromCartesian(pos);
                return {
                    lat: Cesium.Math.toDegrees(cartographic.latitude),
                    lon: Cesium.Math.toDegrees(cartographic.longitude),
                    alt: cartographic.height || 100 // Default altitude
                };
            });

            // Create waypoint object
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

            // Add to waypoints array
            this.waypoints.push(waypoint);
            
            // Save to storage
            await this.waypointStorage.saveWaypoints(this.waypoints);
            
            // Individual file save is handled by saveCurrentWaypointAuto only
            // Removed duplicate call to prevent double file creation
            
            // Update UI
            this.updateWaypointsList();
            
            // Hide modal
            this.hideWaypointModal();
            
            // Add success message
            this.addAIMessage(`✅ Waypoint "${name}" saved successfully!`);
            
        } catch (error) {
            console.error('Failed to save waypoint:', error);
            this.addAIMessage(`❌ Failed to save waypoint: ${error.message}`);
        }
    }

    updateWaypointsList() {
        console.log('updateWaypointsList called');
        console.log(`Current waypoints: ${this.waypoints.length}`);
        
        const waypointsTableBody = document.getElementById('waypoints-table-body');
        const waypointsTable = document.getElementById('waypoints-table');
        const emptyState = document.getElementById('empty-waypoints');
        
        console.log('DOM elements found:', {
            waypointsTableBody: !!waypointsTableBody,
            waypointsTable: !!waypointsTable,
            emptyState: !!emptyState
        });
        
        if (!waypointsTableBody || !waypointsTable || !emptyState) {
            console.error('Required DOM elements not found');
            return;
        }

        // Clear existing waypoints
        waypointsTableBody.innerHTML = '';

        // Always show table for debugging
        waypointsTable.style.display = 'table';
        
        if (this.waypoints.length === 0) {
            console.log('No waypoints to display, showing empty state');
            emptyState.style.display = 'block';
            return;
        }

        console.log(`Displaying ${this.waypoints.length} waypoints`);
        emptyState.style.display = 'none';

        // Add waypoints to the table
        this.waypoints.forEach((waypoint, index) => {
            console.log(`Adding waypoint ${index + 1}:`, waypoint.name);
            const isSelected = this.selectedWaypoints.includes(waypoint.id);
            
            const row = document.createElement('tr');
            row.dataset.waypointId = waypoint.id;
            
            row.innerHTML = `
                <td>
                    <div class="waypoint-number">${index + 1}</div>
                </td>
                <td>
                    <div class="waypoint-name" data-waypoint-id="${waypoint.id}">
                        ${waypoint.name || `Waypoint#${index + 1}`}
                    </div>
                </td>
                <td>
                    <div class="waypoint-type">${waypoint.type}</div>
                </td>
                <td>
                    <div class="waypoint-points">${waypoint.coordinates.length}</div>
                </td>
                <td class="waypoint-status">
                    <button class="waypoint-select-btn ${isSelected ? 'selected' : ''}" 
                            data-waypoint-id="${waypoint.id}" 
                            title="${isSelected ? 'Deselect' : 'Select'} waypoint">
                        <i class="fas fa-${isSelected ? 'check-circle' : 'circle'}"></i>
                    </button>
                </td>
                <td class="waypoint-actions-cell">
                    <button class="waypoint-action-btn edit-btn" 
                            data-waypoint-id="${waypoint.id}" 
                            title="Edit waypoint name">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="waypoint-action-btn delete-btn" 
                            data-waypoint-id="${waypoint.id}" 
                            title="Delete waypoint">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            waypointsTableBody.appendChild(row);
        });

        console.log('Added all waypoints to table');

        // Add event listeners for the new waypoints
        this.addWaypointEventListeners();
        console.log('Added event listeners');
    }

    addWaypointEventListeners() {
        // Add click listeners for waypoint names (double-click to edit)
        const waypointNames = document.querySelectorAll('.waypoint-name');
        waypointNames.forEach(nameElement => {
            nameElement.addEventListener('dblclick', (e) => {
                e.preventDefault();
                this.startEditingWaypointName(nameElement);
            });
        });

        // Add click listeners for edit buttons
        const editButtons = document.querySelectorAll('.waypoint-action-btn.edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const waypointId = button.dataset.waypointId;
                const nameElement = document.querySelector(`.waypoint-name[data-waypoint-id="${waypointId}"]`);
                if (nameElement) {
                    this.startEditingWaypointName(nameElement);
                }
            });
        });

        // Add click listeners for delete buttons
        const deleteButtons = document.querySelectorAll('.waypoint-action-btn.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const waypointId = button.dataset.waypointId;
                this.deleteWaypoint(waypointId);
            });
        });

        // Add click listeners for select buttons
        const selectButtons = document.querySelectorAll('.waypoint-select-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const waypointId = button.dataset.waypointId;
                this.toggleWaypointSelection(waypointId);
            });
        });
    }

    startEditingWaypointName(nameElement) {
        const waypointId = nameElement.dataset.waypointId;
        const currentName = nameElement.textContent.trim();
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'waypoint-name-input';
        input.value = currentName;
        input.dataset.waypointId = waypointId;
        
        // Replace the name element with input
        nameElement.style.display = 'none';
        nameElement.parentNode.insertBefore(input, nameElement);
        
        // Focus and select all text
        input.focus();
        input.select();
        
        // Handle save on Enter or blur
        const saveEdit = async () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                await this.updateWaypointName(waypointId, newName);
            }
            
            // Restore the name element
            nameElement.textContent = newName || currentName;
            nameElement.style.display = 'block';
            input.remove();
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                // Cancel edit
                nameElement.style.display = 'block';
                input.remove();
            }
        });
    }

    async updateWaypointName(waypointId, newName) {
        const waypoint = this.waypoints.find(w => w.id === waypointId);
        if (waypoint) {
            const oldName = waypoint.name;
            waypoint.name = newName;
            console.log(`Updated waypoint ${waypointId} name from "${oldName}" to: "${newName}"`);
            
            // Emit waypoint updated event for synchronization (disabled for now)
            // this.emitWaypointEvent('waypointUpdated', waypoint);
            
            // Update the display
            const nameElement = document.querySelector(`.waypoint-name[data-waypoint-id="${waypointId}"]`);
            if (nameElement) {
                nameElement.textContent = newName;
            }
            
            // Save to storage
            await this.waypointStorage.saveWaypoints(this.waypoints);
            
            // Update individual waypoint file
            await this.updateIndividualWaypointFile(waypoint, oldName);
            
            // Update track mission waypoints
            this.updateTrackMissionWithAllWaypoints();
            
            if (this.aiAgent) {
                this.addAIMessage(`✅ Waypoint renamed from "${oldName}" to "${newName}"`);
            }
        }
    }

    toggleWaypointSelection(waypointId) {
        const index = this.selectedWaypoints.indexOf(waypointId);
        if (index > -1) {
            this.selectedWaypoints.splice(index, 1);
        } else {
            this.selectedWaypoints.push(waypointId);
        }
        
        // Update UI to show selection
        this.updateWaypointsList();
        
        // Update track mission waypoints
        this.updateTrackMissionWaypoints();
    }

    async deleteWaypoint(waypointId) {
        if (!confirm('Are you sure you want to delete this waypoint?')) {
            return;
        }

        try {
            // Find the waypoint before removing it
            const waypoint = this.waypoints.find(w => w.id === waypointId);
            const waypointName = waypoint ? waypoint.name : 'Unknown';
            
            // Emit waypoint deleted event for synchronization (disabled for now)
            // this.emitWaypointEvent('waypointDeleted', waypoint);
            
            // Remove from array
            this.waypoints = this.waypoints.filter(w => w.id !== waypointId);
            
            // Remove from selected
            this.selectedWaypoints = this.selectedWaypoints.filter(id => id !== waypointId);
            
            // Save to storage
            await this.waypointStorage.saveWaypoints(this.waypoints);
            
            // Delete individual waypoint file
            await this.deleteIndividualWaypointFile(waypointName);
            
            // Update UI
            this.updateWaypointsList();
            
            // Update track mission with all waypoints
            this.updateTrackMissionWithAllWaypoints();
            
            this.addAIMessage(`✅ Waypoint "${waypointName}" deleted successfully!`);
            
        } catch (error) {
            console.error('Failed to delete waypoint:', error);
            this.addAIMessage(`❌ Failed to delete waypoint: ${error.message}`);
        }
    }

    // Emit waypoint events for synchronization (disabled for now)
    emitWaypointEvent(eventType, waypointData) {
        // Disabled to prevent crashes
        console.log(`📡 Event emission disabled: ${eventType}`);
    }

    // Restore waypoints to the map when app loads
    async restoreWaypointsToMap() {
        try {
            // Wait for Cesium viewer to be available
            if (!window.viewer && !window.cesiumViewer) {
                console.log('Cesium viewer not available yet, retrying in 1 second...');
                setTimeout(() => this.restoreWaypointsToMap(), 1000);
                return;
            }

            const viewer = window.viewer || window.cesiumViewer;
            if (!viewer) {
                console.warn('Cesium viewer not found, cannot restore waypoints to map');
                return;
            }

            console.log(`Restoring ${this.waypoints.length} waypoints to map`);
            
            for (const waypoint of this.waypoints) {
                try {
                    // Convert coordinates back to Cartesian3
                    const positions = waypoint.coordinates.map(coord => 
                        Cesium.Cartesian3.fromDegrees(coord.lon, coord.lat, coord.alt || 100)
                    );

                    // Create entity based on waypoint type
                    let entity;
                    if (waypoint.type === 'circle') {
                        entity = viewer.entities.add({
                            id: waypoint.entityId,
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(positions),
                                material: Cesium.Color.CYAN.withAlpha(0.3),
                                outline: true,
                                outlineColor: Cesium.Color.CYAN,
                                outlineWidth: 2,
                                height: 0,
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                                extrudedHeight: 0
                            }
                        });
                    } else {
                        // Default polygon rendering for squares and polygons
                        entity = viewer.entities.add({
                            id: waypoint.entityId,
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(positions),
                                material: Cesium.Color.CYAN.withAlpha(0.3),
                                outline: true,
                                outlineColor: Cesium.Color.CYAN,
                                outlineWidth: 2,
                                height: 0,
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                                extrudedHeight: 0
                            }
                        });
                    }

                    console.log(`Restored waypoint "${waypoint.name}" to map`);
                } catch (error) {
                    console.error(`Failed to restore waypoint "${waypoint.name}" to map:`, error);
                }
            }

            // Update waypoints list after restoring to map
            this.updateWaypointsList();

            if (this.waypoints.length > 0) {
                this.addAIMessage(`✅ Restored ${this.waypoints.length} waypoints to the map and table`);
            }
        } catch (error) {
            console.error('Failed to restore waypoints to map:', error);
        }
    }

    // Update individual waypoint file when name changes
    async updateIndividualWaypointFile(waypoint, oldName) {
        try {
            // Check if file system is available
            if (!this.waypointStorage || !this.waypointStorage.useFileSystem) {
                console.log('File system not available, skipping individual waypoint file update');
                return;
            }

            // Delete old file if name changed
            if (oldName && oldName !== waypoint.name) {
                const oldFileName = `${oldName.replace(/[<>:"/\\|?*]/g, '_')}.json`;
                const oldFilePath = require('path').join(process.cwd(), 'waypoints', oldFileName);
                
                try {
                    if (require('fs').existsSync(oldFilePath)) {
                        require('fs').unlinkSync(oldFilePath);
                        console.log(`Deleted old waypoint file: ${oldFilePath}`);
                    }
                } catch (error) {
                    console.warn('Failed to delete old waypoint file:', error);
                }
            }

            // Create new file with updated name
            const sanitizedName = waypoint.name.replace(/[<>:"/\\|?*]/g, '_');
            const fileName = `${sanitizedName}.json`;
            const filePath = require('path').join(process.cwd(), 'waypoints', fileName);
            
            // Create waypoint data for individual file
            const waypointData = {
                version: '1.0',
                created: waypoint.created,
                waypoint: waypoint,
                metadata: {
                    savedAt: new Date().toISOString(),
                    source: 'Sky Loom Drawing Tools',
                    format: 'individual',
                    lastModified: new Date().toISOString()
                }
            };

            // Write the updated file
            require('fs').writeFileSync(filePath, JSON.stringify(waypointData, null, 2), 'utf8');
            console.log(`Updated individual waypoint file: ${filePath}`);
            
        } catch (error) {
            console.error('Failed to update individual waypoint file:', error);
            // Don't throw error to avoid breaking the main waypoint saving process
        }
    }

    // Delete individual waypoint file
    async deleteIndividualWaypointFile(waypointName) {
        try {
            // Check if file system is available
            if (!this.waypointStorage || !this.waypointStorage.useFileSystem) {
                console.log('File system not available, skipping individual waypoint file deletion');
                return;
            }

            // Sanitize filename
            const sanitizedName = waypointName.replace(/[<>:"/\\|?*]/g, '_');
            const fileName = `${sanitizedName}.json`;
            const filePath = require('path').join(process.cwd(), 'waypoints', fileName);
            
            // Delete the file
            if (require('fs').existsSync(filePath)) {
                require('fs').unlinkSync(filePath);
                console.log(`Deleted individual waypoint file: ${filePath}`);
            } else {
                console.warn(`Waypoint file not found for deletion: ${filePath}`);
            }
            
        } catch (error) {
            console.error('Failed to delete individual waypoint file:', error);
            // Don't throw error to avoid breaking the main waypoint deletion process
        }
    }

    // Sync waypoints with individual JSON files to ensure consistency
    async syncWithIndividualFiles() {
        try {
            // Check if file system is available
            if (!this.waypointStorage || !this.waypointStorage.useFileSystem) {
                console.log('File system not available, skipping individual file sync');
                return;
            }

            const fs = require('fs');
            const path = require('path');
            const waypointsDir = path.join(process.cwd(), 'waypoints');
            
            // Check if waypoints directory exists
            if (!fs.existsSync(waypointsDir)) {
                console.log('Waypoints directory not found, skipping sync');
                return;
            }

            // Read all JSON files in waypoints directory
            const files = fs.readdirSync(waypointsDir).filter(file => file.endsWith('.json'));
            console.log(`Found ${files.length} individual waypoint files`);

            // Check for orphaned files (files that don't correspond to loaded waypoints)
            const loadedWaypointNames = this.waypoints.map(w => w.name);
            let orphanedFiles = [];

            for (const file of files) {
                const waypointName = file.replace('.json', '');
                if (!loadedWaypointNames.includes(waypointName)) {
                    orphanedFiles.push(file);
                }
            }

            // Remove orphaned files
            for (const orphanedFile of orphanedFiles) {
                const filePath = path.join(waypointsDir, orphanedFile);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Removed orphaned waypoint file: ${orphanedFile}`);
                } catch (error) {
                    console.warn(`Failed to remove orphaned file ${orphanedFile}:`, error);
                }
            }

            if (orphanedFiles.length > 0) {
                console.log(`Cleaned up ${orphanedFiles.length} orphaned waypoint files`);
            }

        } catch (error) {
            console.error('Failed to sync with individual files:', error);
        }
    }

    updateTrackMissionWithAllWaypoints() {
        // Convert all waypoints to track mission format
        const trackMissionWaypoints = this.waypoints.flatMap(waypoint => 
            waypoint.coordinates.map((coord, index) => ({
                id: `${waypoint.id}_${index}`,
                name: `${waypoint.name}_${index + 1}`,
                latitude: coord.lat,
                longitude: coord.lon,
                altitude: coord.alt,
                description: `Point ${index + 1} of ${waypoint.name}`
            }))
        );

        // Update track mission waypoints list
        const trackMissionInstance = TrackMission.getInstance();
        if (trackMissionInstance) {
            trackMissionInstance.updateWaypointsList(trackMissionWaypoints);
        }
    }

    updateTrackMissionWaypoints() {
        // Get selected waypoints
        const selectedWaypoints = this.waypoints.filter(w => 
            this.selectedWaypoints.includes(w.id)
        );

        // Convert to track mission format
        const trackMissionWaypoints = selectedWaypoints.flatMap(waypoint => 
            waypoint.coordinates.map((coord, index) => ({
                id: `${waypoint.id}_${index}`,
                name: `${waypoint.name}_${index + 1}`,
                latitude: coord.lat,
                longitude: coord.lon,
                altitude: coord.alt,
                description: `Point ${index + 1} of ${waypoint.name}`
            }))
        );

        // Update track mission waypoints list
        const trackMissionInstance = TrackMission.getInstance();
        if (trackMissionInstance) {
            trackMissionInstance.updateWaypointsList(trackMissionWaypoints);
        }
    }

    // Utility methods
    calculateArea(coordinates) {
        // Simple area calculation (approximate)
        if (coordinates.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].lon * coordinates[j].lat;
            area -= coordinates[j].lon * coordinates[i].lat;
        }
        return Math.abs(area) / 2;
    }

    calculatePerimeter(coordinates) {
        if (coordinates.length < 2) return 0;
        
        let perimeter = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            const dx = coordinates[j].lon - coordinates[i].lon;
            const dy = coordinates[j].lat - coordinates[i].lat;
            perimeter += Math.sqrt(dx * dx + dy * dy);
        }
        return perimeter;
    }

    // Save individual waypoint JSON file to waypoints folder
    async saveIndividualWaypointFile(waypoint) {
        try {
            // Check if file system is available
            if (!this.waypointStorage || !this.waypointStorage.useFileSystem) {
                console.log('File system not available, skipping individual waypoint file save');
                return;
            }

            // Sanitize filename (remove invalid characters)
            const sanitizedName = waypoint.name.replace(/[<>:"/\\|?*]/g, '_');
            const fileName = `${sanitizedName}.json`;
            const filePath = require('path').join(process.cwd(), 'waypoints', fileName);
            
            // Removed file existence check since we fixed the duplicate calling issue
            
            // Create waypoint data for individual file
            const waypointData = {
                version: '1.0',
                created: waypoint.created,
                waypoint: waypoint,
                metadata: {
                    savedAt: new Date().toISOString(),
                    source: 'Sky Loom Drawing Tools',
                    format: 'individual'
                }
            };

            // Write the file
            require('fs').writeFileSync(filePath, JSON.stringify(waypointData, null, 2), 'utf8');
            console.log(`Individual waypoint file saved: ${filePath}`);
            
        } catch (error) {
            console.error('Failed to save individual waypoint file:', error);
            // Don't throw error to avoid breaking the main waypoint saving process
        }
    }

    // API methods for sending waypoints to backend
    async sendWaypointsToBackend(missionName) {
        if (this.selectedWaypoints.length === 0) {
            throw new Error('No waypoints selected');
        }

        const selectedWaypoints = this.waypoints.filter(w => 
            this.selectedWaypoints.includes(w.id)
        );

        // Convert to backend format
        const waypointsData = selectedWaypoints.flatMap(waypoint => 
            waypoint.coordinates.map(coord => ({
                lat: coord.lat,
                lon: coord.lon,
                alt: coord.alt
            }))
        );

        // Get context waypoints
        const contextWaypoints = this.getSelectedContextWaypoints();

        const payload = {
            "waypoints name": missionName,
            "waypoints": waypointsData,
            "context_waypoints": contextWaypoints // Include context waypoints
        };

        try {
            const response = await fetch('http://localhost:8000/waypoints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Failed to send waypoints to backend:', error);
            throw error;
        }
    }

    // Public methods for external access
    getSelectedWaypoints() {
        return this.waypoints.filter(w => this.selectedWaypoints.includes(w.id));
    }

    clearSelectedWaypoints() {
        this.selectedWaypoints = [];
        this.updateWaypointsList();
        this.updateTrackMissionWaypoints();
    }

    // Context dropdown methods
    toggleContextDropdown() {
        console.log('toggleContextDropdown called');
        const contextDropdown = document.getElementById('context-dropdown');
        console.log('Context dropdown element:', !!contextDropdown);
        
        if (contextDropdown) {
            if (contextDropdown.classList.contains('show')) {
                this.hideContextDropdown();
            } else {
                this.showContextDropdown();
            }
        }
    }

    showContextDropdown() {
        console.log('showContextDropdown called');
        const contextDropdown = document.getElementById('context-dropdown');
        if (contextDropdown) {
            contextDropdown.classList.add('show');
            this.populateContextDropdown();
            console.log('Context dropdown should be visible now');
        }
    }

    hideContextDropdown() {
        const contextDropdown = document.getElementById('context-dropdown');
        if (contextDropdown) {
            contextDropdown.classList.remove('show');
        }
    }

    populateContextDropdown() {
        this.populateWaypointsContext();
        this.populateDronesContext();
    }

    populateWaypointsContext() {
        const waypointsContext = document.getElementById('waypoints-context');
        if (!waypointsContext) return;

        waypointsContext.innerHTML = '';

        if (this.waypoints.length === 0) {
            waypointsContext.innerHTML = '<div class="context-item empty">No waypoints available</div>';
            return;
        }

        this.waypoints.forEach(waypoint => {
            const item = document.createElement('div');
            item.className = 'context-item';
            item.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <span>${waypoint.name}</span>
            `;
            item.addEventListener('click', () => {
                this.insertWaypointContext(waypoint.name);
            });
            waypointsContext.appendChild(item);
        });
    }

    populateDronesContext() {
        const dronesContext = document.getElementById('drones-context');
        if (!dronesContext) return;

        dronesContext.innerHTML = '';

        // For now, we'll show a placeholder. You can populate this with actual drone data later
        dronesContext.innerHTML = '<div class="context-item empty">No drones available</div>';
    }

    insertWaypointContext(waypointName) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            const currentValue = chatInput.value;
            const cursorPos = chatInput.selectionStart;
            const newValue = currentValue.slice(0, cursorPos) + `@${waypointName} ` + currentValue.slice(cursorPos);
            chatInput.value = newValue;
            chatInput.focus();
            chatInput.setSelectionRange(cursorPos + waypointName.length + 2, cursorPos + waypointName.length + 2);
        }
        this.hideContextDropdown();
        
        // Add to selected context waypoints if not already selected
        this.addContextWaypoint(waypointName);
    }

    // Enhanced @ functionality methods
    initializeContextWaypointsDisplay() {
        // Create the context waypoints display area
        const inputTopRow = document.querySelector('.input-top-row');
        if (inputTopRow) {
            // Create container for selected waypoints
            const contextContainer = document.createElement('div');
            contextContainer.className = 'context-waypoints-container';
            contextContainer.id = 'context-waypoints-container';
            
            // Insert after the input-top-row
            inputTopRow.parentNode.insertBefore(contextContainer, inputTopRow.nextSibling);
            
            this.contextWaypointsContainer = contextContainer;
            this.updateContextWaypointsDisplay();
        }
    }

    // Enhanced @ functionality for text input
    handleTextInput(e) {
        const input = e.target;
        const value = input.value;
        const cursorPos = input.selectionStart;
        
        // Check if @ was just typed
        if (value[cursorPos - 1] === '@') {
            console.log('@ symbol detected, showing waypoint suggestions');
            this.showWaypointSuggestions(input, cursorPos);
        } else if (this.waypointSuggestionsVisible) {
            // Check if we should hide suggestions
            const beforeCursor = value.substring(0, cursorPos);
            const lastAtSymbol = beforeCursor.lastIndexOf('@');
            
            if (lastAtSymbol === -1) {
                console.log('No @ symbol found, hiding suggestions');
                this.hideWaypointSuggestions();
            } else {
                // Update suggestions based on what's typed after @
                const searchTerm = beforeCursor.substring(lastAtSymbol + 1);
                console.log('Updating suggestions with search term:', searchTerm);
                this.updateWaypointSuggestions(input, lastAtSymbol, searchTerm);
            }
        }
    }

    showWaypointSuggestions(input, cursorPos) {
        this.hideWaypointSuggestions(); // Hide any existing suggestions
        
        // Create suggestions dropdown
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'waypoint-suggestions-dropdown';
        suggestionsContainer.id = 'waypoint-suggestions-dropdown';
        
        // Position the dropdown above the input (drop-up)
        suggestionsContainer.style.position = 'absolute';
        suggestionsContainer.style.left = '0';
        suggestionsContainer.style.right = '0';
        suggestionsContainer.style.bottom = '100%'; // Position above instead of below
        suggestionsContainer.style.zIndex = '1001';
        suggestionsContainer.style.marginBottom = '4px'; // Add some spacing
        
        // Add to the input container
        const inputContainer = input.closest('.unified-input-container');
        inputContainer.style.position = 'relative';
        inputContainer.appendChild(suggestionsContainer);
        
        // Populate with waypoints
        this.populateWaypointSuggestions(suggestionsContainer, '');
        
        this.waypointSuggestionsVisible = true;
        this.currentSuggestionsInput = input;
    }

    hideWaypointSuggestions() {
        const suggestionsDropdown = document.getElementById('waypoint-suggestions-dropdown');
        if (suggestionsDropdown) {
            suggestionsDropdown.remove();
        }
        this.waypointSuggestionsVisible = false;
        this.currentSuggestionsInput = null;
        this.currentSuggestionIndex = -1; // Reset navigation index
    }

    updateWaypointSuggestions(input, atPosition, searchTerm) {
        const suggestionsDropdown = document.getElementById('waypoint-suggestions-dropdown');
        if (suggestionsDropdown) {
            this.populateWaypointSuggestions(suggestionsDropdown, searchTerm);
        }
    }

    populateWaypointSuggestions(container, searchTerm) {
        container.innerHTML = '';
        
        if (this.waypoints.length === 0) {
            container.innerHTML = '<div class="suggestion-item empty">No waypoints available</div>';
            return;
        }
        
        // Filter waypoints based on search term
        const filteredWaypoints = this.waypoints.filter(waypoint => 
            waypoint.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (filteredWaypoints.length === 0) {
            container.innerHTML = '<div class="suggestion-item empty">No waypoints found</div>';
            return;
        }
        
        // Add waypoint suggestions
        filteredWaypoints.forEach((waypoint, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.dataset.index = index;
            item.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <span class="waypoint-name">${waypoint.name}</span>
                <span class="waypoint-type">${waypoint.type}</span>
            `;
            
            item.addEventListener('click', () => {
                this.insertWaypointInText(waypoint.name);
            });
            
            container.appendChild(item);
        });
        
        // Reset navigation index
        this.currentSuggestionIndex = -1;
    }

    // Keyboard navigation methods
    navigateSuggestions(direction) {
        const suggestionsDropdown = document.getElementById('waypoint-suggestions-dropdown');
        if (!suggestionsDropdown) return;
        
        const items = suggestionsDropdown.querySelectorAll('.suggestion-item:not(.empty)');
        if (items.length === 0) return;
        
        // Remove previous selection
        if (this.currentSuggestionIndex >= 0 && this.currentSuggestionIndex < items.length) {
            items[this.currentSuggestionIndex].classList.remove('selected');
        }
        
        if (direction === 'ArrowDown') {
            this.currentSuggestionIndex = (this.currentSuggestionIndex + 1) % items.length;
        } else if (direction === 'ArrowUp') {
            this.currentSuggestionIndex = this.currentSuggestionIndex <= 0 ? items.length - 1 : this.currentSuggestionIndex - 1;
        }
        
        // Add selection to current item
        if (this.currentSuggestionIndex >= 0 && this.currentSuggestionIndex < items.length) {
            items[this.currentSuggestionIndex].classList.add('selected');
            items[this.currentSuggestionIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    selectCurrentSuggestion() {
        const suggestionsDropdown = document.getElementById('waypoint-suggestions-dropdown');
        if (!suggestionsDropdown) return;
        
        const items = suggestionsDropdown.querySelectorAll('.suggestion-item:not(.empty)');
        if (this.currentSuggestionIndex >= 0 && this.currentSuggestionIndex < items.length) {
            const selectedItem = items[this.currentSuggestionIndex];
            const waypointName = selectedItem.querySelector('.waypoint-name').textContent;
            this.insertWaypointInText(waypointName);
        }
    }

    insertWaypointInText(waypointName) {
        const input = this.currentSuggestionsInput;
        if (!input) return;
        
        const value = input.value;
        const cursorPos = input.selectionStart;
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        
        // Find the last @ symbol before cursor
        const lastAtSymbol = beforeCursor.lastIndexOf('@');
        if (lastAtSymbol === -1) return;
        
        // Replace from @ to cursor with the waypoint name
        const newValue = value.substring(0, lastAtSymbol) + `@${waypointName} ` + afterCursor;
        input.value = newValue;
        
        // Set cursor position after the inserted waypoint
        const newCursorPos = lastAtSymbol + waypointName.length + 2; // +2 for @ and space
        input.setSelectionRange(newCursorPos, newCursorPos);
        
        // Hide suggestions
        this.hideWaypointSuggestions();
        
        // Add to selected context waypoints
        this.addContextWaypoint(waypointName);
        
        // Focus back to input
        input.focus();
    }

    addContextWaypoint(waypointName) {
        if (!this.selectedContextWaypoints.includes(waypointName)) {
            this.selectedContextWaypoints.push(waypointName);
            this.updateContextWaypointsDisplay();
            console.log('Added context waypoint:', waypointName);
            console.log('Current context waypoints:', this.selectedContextWaypoints);
        }
    }

    removeContextWaypoint(waypointName) {
        const index = this.selectedContextWaypoints.indexOf(waypointName);
        if (index > -1) {
            this.selectedContextWaypoints.splice(index, 1);
            this.updateContextWaypointsDisplay();
            console.log('Removed context waypoint:', waypointName);
            console.log('Current context waypoints:', this.selectedContextWaypoints);
        }
    }

    updateContextWaypointsDisplay() {
        if (!this.contextWaypointsContainer) return;
        
        this.contextWaypointsContainer.innerHTML = '';
        
        if (this.selectedContextWaypoints.length === 0) {
            this.contextWaypointsContainer.style.display = 'none';
            return;
        }
        
        this.contextWaypointsContainer.style.display = 'block';
        
        this.selectedContextWaypoints.forEach(waypointName => {
            const waypointTag = document.createElement('div');
            waypointTag.className = 'context-waypoint-tag';
            waypointTag.innerHTML = `
                <span class="waypoint-name">@${waypointName}</span>
                <button class="remove-waypoint-btn" data-waypoint="${waypointName}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Add hover effect for close button
            waypointTag.addEventListener('mouseenter', () => {
                const closeBtn = waypointTag.querySelector('.remove-waypoint-btn');
                if (closeBtn) closeBtn.style.opacity = '1';
            });
            
            waypointTag.addEventListener('mouseleave', () => {
                const closeBtn = waypointTag.querySelector('.remove-waypoint-btn');
                if (closeBtn) closeBtn.style.opacity = '0.5';
            });
            
            // Add click handler for remove button
            const removeBtn = waypointTag.querySelector('.remove-waypoint-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeContextWaypoint(waypointName);
                });
            }
            
            this.contextWaypointsContainer.appendChild(waypointTag);
        });
    }

    getSelectedContextWaypoints() {
        return this.selectedContextWaypoints;
    }

    clearSelectedContextWaypoints() {
        this.selectedContextWaypoints = [];
        this.updateContextWaypointsDisplay();
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
                    this.addAIMessage('🎨 Drawing tools are now ready! Click the drawing buttons to start creating waypoints.');
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

    // Mode selection methods
    toggleModeDropdown() {
        console.log('🔄 toggleModeDropdown called');
        const modeDropdownBtn = document.getElementById('mode-dropdown-btn');
        const modeDropdownMenu = document.getElementById('mode-dropdown-menu');
        
        console.log('Mode dropdown elements:', {
            modeDropdownBtn: !!modeDropdownBtn,
            modeDropdownMenu: !!modeDropdownMenu
        });
        
        if (modeDropdownBtn && modeDropdownMenu) {
            if (modeDropdownMenu.classList.contains('show')) {
                console.log('Hiding mode dropdown');
                this.hideModeDropdown();
            } else {
                console.log('Showing mode dropdown');
                this.showModeDropdown();
            }
        } else {
            console.error('❌ Mode dropdown elements not found');
        }
    }

    showModeDropdown() {
        const modeDropdownBtn = document.getElementById('mode-dropdown-btn');
        const modeDropdownMenu = document.getElementById('mode-dropdown-menu');
        
        if (modeDropdownBtn && modeDropdownMenu) {
            modeDropdownMenu.classList.add('show');
            modeDropdownBtn.classList.add('open');
        }
    }

    hideModeDropdown() {
        const modeDropdownBtn = document.getElementById('mode-dropdown-btn');
        const modeDropdownMenu = document.getElementById('mode-dropdown-menu');
        
        if (modeDropdownBtn && modeDropdownMenu) {
            modeDropdownMenu.classList.remove('show');
            modeDropdownBtn.classList.remove('open');
        }
    }

    selectMode(mode) {
        const selectedModeSpan = document.getElementById('selected-mode');
        if (selectedModeSpan) {
            // Convert mode to display name
            const displayNames = {
                'surveillance': 'Surveillance',
                'object-detection': 'Object Detection',
                '3d-mapping': '3D Mapping'
            };
            selectedModeSpan.textContent = displayNames[mode] || mode;
        }

        // Remove selected class from all mode items
        const modeItems = document.querySelectorAll('.mode-item');
        modeItems.forEach(item => {
            item.classList.remove('selected');
        });

        // Add selected class to chosen item
        const selectedItem = document.querySelector(`[data-mode="${mode}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Store selected mode
        this.selectedMode = mode;

        this.hideModeDropdown();
    }

    // Model dropdown methods
    toggleModelDropdown() {
        console.log('🔄 toggleModelDropdown called');
        const modelDropdownBtn = document.getElementById('model-dropdown-btn');
        const modelDropdownMenu = document.getElementById('model-dropdown-menu');
        
        console.log('Model dropdown elements:', {
            modelDropdownBtn: !!modelDropdownBtn,
            modelDropdownMenu: !!modelDropdownMenu
        });
        
        if (modelDropdownBtn && modelDropdownMenu) {
            if (modelDropdownMenu.classList.contains('show')) {
                console.log('Hiding model dropdown');
                this.hideModelDropdown();
            } else {
                console.log('Showing model dropdown');
                this.showModelDropdown();
            }
        } else {
            console.error('❌ Model dropdown elements not found');
        }
    }

    showModelDropdown() {
        const modelDropdownBtn = document.getElementById('model-dropdown-btn');
        const modelDropdownMenu = document.getElementById('model-dropdown-menu');
        
        if (modelDropdownBtn && modelDropdownMenu) {
            modelDropdownMenu.classList.add('show');
            modelDropdownBtn.classList.add('open');
        }
    }

    hideModelDropdown() {
        const modelDropdownBtn = document.getElementById('model-dropdown-btn');
        const modelDropdownMenu = document.getElementById('model-dropdown-menu');
        
        if (modelDropdownBtn && modelDropdownMenu) {
            modelDropdownMenu.classList.remove('show');
            modelDropdownBtn.classList.remove('open');
        }
    }

    selectModel(model) {
        const selectedModelSpan = document.getElementById('selected-model');
        if (selectedModelSpan) {
            selectedModelSpan.textContent = model.charAt(0).toUpperCase() + model.slice(1);
        }

        // Remove selected class from all items
        const modelDropdownItems = document.querySelectorAll('.model-item');
        modelDropdownItems.forEach(item => {
            item.classList.remove('selected');
        });

        // Add selected class to chosen item
        const selectedItem = document.querySelector(`[data-model="${model}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Store selected model
        this.selectedModel = model;

        this.hideModelDropdown();
    }

    // Stop operation method
    stopCurrentOperation() {
        this.addAIMessage('🛑 Operation stopped by user.');
        
        // Switch back to start button
        this.showStartButton();
        
        // Add any specific stop logic here
        // For example, if there's an ongoing API call, you could cancel it
    }

    
}

// Export for global access
window.AIAgent = AIAgent;

// Global test function
// (Removed test globals: testAIAgent, testEnhancedAt, testWaypointSuggestions)

// Global test function for waypoint API
// (Removed test global: testWaypointAPI)
// (Removed test global: testDirectAPI)

// (Removed debug/test globals: fixDrawingTools, testDrawingTools, testNetworkConnectivity)

} // End of AIAgent class definition guard