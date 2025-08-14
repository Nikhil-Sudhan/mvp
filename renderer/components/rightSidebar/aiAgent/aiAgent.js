// Prevent redeclaration if already loaded
if (typeof AIAgent === 'undefined') {
    
class AIAgent {
    constructor() {
        this.droneCommandAPI = null;
        this.waypointStorage = null;
        this.selectedMode = 'surveillance'; // Default mode
        this.selectedModel = 'auto'; // Default model
        
        // New properties for enhanced @ functionality
        this.selectedContextWaypoints = []; // List of waypoint names selected via @
        this.selectedContextDrones = []; // List of drone names selected via @
        this.contextWaypointsContainer = null; // Reference to the context display area
        
        // Properties for waypoint suggestions dropdown
        this.waypointSuggestionsVisible = false;
        this.currentSuggestionsInput = null;
        this.currentSuggestionIndex = -1; // For keyboard navigation
        
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
            // Initialize storage
            this.waypointStorage = new WaypointStorage();
            
            // Load existing waypoints into storage
            const waypoints = await this.waypointStorage.loadWaypoints();
            console.log(`Loaded ${waypoints.length} waypoints from storage`);
            
            // Set waypoints in storage
            this.waypointStorage.setWaypoints(waypoints);
            
            // Sync with individual JSON files to ensure consistency
            await this.waypointStorage.syncWithIndividualFiles();
            
            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update waypoints list immediately
            this.updateWaypointsList();
            
            // Restore waypoints to the map
            await this.waypointStorage.restoreWaypointsToMap();
            
            // Initialize default selections
            this.selectMode('surveillance');
            this.selectModel('auto');
            
            // Initialize start button state
            this.showStartButton();
            
            // Initialize context waypoints display
            this.initializeContextWaypointsDisplay();
            
            // Initialize API Mission Renderer
            if (!window.apiMissionRenderer) {
                window.apiMissionRenderer = new ApiMissionRenderer();
            }
            window.apiMissionRenderer.setAIAgent(this);
            
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



        // Save waypoints when app closes
        window.addEventListener('beforeunload', async (e) => {
            if (this.waypointStorage) {
                try {
                    await this.waypointStorage.saveWaypoints(this.waypointStorage.getWaypoints());
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
                    // Add small delay to allow item click handlers to execute first
                    setTimeout(() => {
                        this.hideWaypointSuggestions();
                    }, 100);
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
        
        // Get selected context waypoints and drones
        const contextWaypoints = this.getSelectedContextWaypoints();
        const contextDrones = this.getSelectedContextDrones();
        console.log('📍 Context waypoints:', contextWaypoints);
        console.log('🚁 Context drones:', contextDrones);
        
        // Send message using API Mission Renderer
        if (window.apiMissionRenderer) {
            await window.apiMissionRenderer.sendMessage(message, contextWaypoints, contextDrones);
        } else {
            console.error('❌ API Mission Renderer not available');
            this.addAIMessage('❌ API Mission Renderer not available');
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







    getWaypointDataForContext(contextWaypointNames) {
        return window.getWaypointDataForContext(contextWaypointNames);
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



    updateWaypointsList() {
        console.log('updateWaypointsList called');
        
        // Get waypoints from storage
        const waypoints = this.waypointStorage.getWaypoints();
        const selectedWaypoints = this.waypointStorage.getSelectedWaypoints();
        
        console.log(`Current waypoints: ${waypoints.length}`);
        
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
        
        if (waypoints.length === 0) {
            console.log('No waypoints to display, showing empty state');
            emptyState.style.display = 'block';
            return;
        }

        console.log(`Displaying ${waypoints.length} waypoints`);
        emptyState.style.display = 'none';

        // Add waypoints to the table
        waypoints.forEach((waypoint, index) => {
            console.log(`Adding waypoint ${index + 1}:`, waypoint.name);
            const isSelected = selectedWaypoints.includes(waypoint.id);
            
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
        try {
            const waypoint = await this.waypointStorage.updateWaypointName(waypointId, newName);
            
            // Update the display
            const nameElement = document.querySelector(`.waypoint-name[data-waypoint-id="${waypointId}"]`);
            if (nameElement) {
                nameElement.textContent = newName;
            }
            
            // Update track mission waypoints
            this.updateTrackMissionWithAllWaypoints();
            
            this.addAIMessage(`✅ Waypoint renamed from "${waypoint.name}" to "${newName}"`);
        } catch (error) {
            console.error('Failed to update waypoint name:', error);
            this.addAIMessage(`❌ Failed to update waypoint name: ${error.message}`);
        }
    }

    toggleWaypointSelection(waypointId) {
        this.waypointStorage.toggleWaypointSelection(waypointId);
        
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
            const waypointName = await this.waypointStorage.deleteWaypoint(waypointId);
            

            
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



    // Restore waypoints to the map when app loads
    async restoreWaypointsToMap() {
        await this.waypointStorage.restoreWaypointsToMap();
        this.updateWaypointsList();
    }







    updateTrackMissionWithAllWaypoints() {
        const trackMissionWaypoints = this.waypointStorage.convertToTrackMissionFormat();
        
        // Update track mission waypoints list
        const trackMissionInstance = TrackMission.getInstance();
        if (trackMissionInstance) {
            trackMissionInstance.updateWaypointsList(trackMissionWaypoints);
        }
    }

    updateTrackMissionWaypoints() {
        const trackMissionWaypoints = this.waypointStorage.convertSelectedToTrackMissionFormat();
        
        // Update track mission waypoints list
        const trackMissionInstance = TrackMission.getInstance();
        if (trackMissionInstance) {
            trackMissionInstance.updateWaypointsList(trackMissionWaypoints);
        }
    }

    // Utility methods moved to DrawingTools (calculateArea, calculatePerimeter)



    // API methods for sending waypoints to backend
    async sendWaypointsToBackend(missionName) {
        return await this.waypointStorage.sendWaypointsToBackend(missionName);
    }

    // Public methods for external access
    getSelectedWaypoints() {
        return this.waypointStorage.getSelectedWaypointObjects();
    }

    clearSelectedWaypoints() {
        this.waypointStorage.clearSelectedWaypoints();
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

        const availableWaypoints = this.waypointStorage.getWaypoints();
        if (availableWaypoints.length === 0) {
            waypointsContext.innerHTML = '<div class="context-item empty">No waypoints available</div>';
            return;
        }

        availableWaypoints.forEach(waypoint => {
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

        // Get drones from drone list manager
        const availableDrones = window.droneListManager ? window.droneListManager.getDronesForDisplay() : [];

        if (availableDrones.length === 0) {
            dronesContext.innerHTML = '<div class="context-item empty">No drones available</div>';
            return;
        }

        availableDrones.forEach(drone => {
            const item = document.createElement('div');
            item.className = 'context-item';
            item.innerHTML = `
                <i class="fas fa-drone"></i>
                <span>${drone.name}</span>
                <small class="drone-type">${drone.type}</small>
            `;
            item.addEventListener('click', () => {
                this.insertDroneContext(drone.name);
            });
            dronesContext.appendChild(item);
        });
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

    insertDroneContext(droneName) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            const currentValue = chatInput.value;
            const cursorPos = chatInput.selectionStart;
            const newValue = currentValue.slice(0, cursorPos) + `@${droneName} ` + currentValue.slice(cursorPos);
            chatInput.value = newValue;
            chatInput.focus();
            chatInput.setSelectionRange(cursorPos + droneName.length + 2, cursorPos + droneName.length + 2);
        }
        this.hideContextDropdown();
        
        // Add to selected context drones
        this.addContextDrone(droneName);
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
        
        // Get waypoints and drones
        const availableWaypoints = this.waypointStorage.getWaypoints() || [];
        const availableDrones = window.droneListManager ? window.droneListManager.getDronesForDisplay() : [];
        
        // Filter waypoints based on search term
        const filteredWaypoints = availableWaypoints.filter(waypoint => 
            waypoint.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Filter drones based on search term
        const filteredDrones = availableDrones.filter(drone => 
            drone.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const totalItems = filteredWaypoints.length + filteredDrones.length;
        
        if (totalItems === 0) {
            const emptyMessage = availableWaypoints.length === 0 && availableDrones.length === 0 
                ? 'No waypoints or drones available' 
                : 'No waypoints or drones found';
            container.innerHTML = `<div class="suggestion-item empty">${emptyMessage}</div>`;
            return;
        }
        
        let itemIndex = 0;
        
        // Add drone suggestions first
        filteredDrones.forEach((drone) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item drone-suggestion';
            item.dataset.index = itemIndex++;
            item.dataset.type = 'drone';
            item.dataset.name = drone.name;
            item.innerHTML = `
                <i class="fas fa-drone"></i>
                <span class="drone-name">${drone.name}</span>
                <span class="drone-type">${drone.type}</span>
            `;
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚁 Drone clicked:', drone.name);
                this.insertDroneInText(drone.name);
            });
            
            container.appendChild(item);
        });
        
        // Add waypoint suggestions
        filteredWaypoints.forEach((waypoint) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item waypoint-suggestion';
            item.dataset.index = itemIndex++;
            item.dataset.type = 'waypoint';
            item.dataset.name = waypoint.name;
            item.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <span class="waypoint-name">${waypoint.name}</span>
                <span class="waypoint-type">${waypoint.type}</span>
            `;
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📍 Waypoint clicked:', waypoint.name);
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
            const itemType = selectedItem.dataset.type;
            const itemName = selectedItem.dataset.name;
            
            if (itemType === 'drone') {
                this.insertDroneInText(itemName);
            } else {
                this.insertWaypointInText(itemName);
            }
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

    insertDroneInText(droneName) {
        const input = this.currentSuggestionsInput;
        if (!input) return;
        
        const value = input.value;
        const cursorPos = input.selectionStart;
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);
        
        // Find the last @ symbol before cursor
        const lastAtSymbol = beforeCursor.lastIndexOf('@');
        if (lastAtSymbol === -1) return;
        
        // Replace from @ to cursor with the drone name
        const newValue = value.substring(0, lastAtSymbol) + `@${droneName} ` + afterCursor;
        input.value = newValue;
        
        // Set cursor position after the inserted drone
        const newCursorPos = lastAtSymbol + droneName.length + 2; // +2 for @ and space
        input.setSelectionRange(newCursorPos, newCursorPos);
        
        // Hide suggestions
        this.hideWaypointSuggestions();
        
        // Add to selected context drones
        this.addContextDrone(droneName);
        
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
        
        const totalItems = this.selectedContextWaypoints.length + this.selectedContextDrones.length;
        if (totalItems === 0) {
            this.contextWaypointsContainer.style.display = 'none';
            return;
        }
        
        this.contextWaypointsContainer.style.display = 'block';
        
        // Add waypoint tags
        this.selectedContextWaypoints.forEach(waypointName => {
            const waypointTag = document.createElement('div');
            waypointTag.className = 'context-waypoint-tag';
            waypointTag.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <span class="waypoint-name">@${waypointName}</span>
                <button class="remove-waypoint-btn" data-waypoint="${waypointName}" data-type="waypoint">
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

        // Add drone tags
        this.selectedContextDrones.forEach(droneName => {
            const droneTag = document.createElement('div');
            droneTag.className = 'context-waypoint-tag context-drone-tag';
            droneTag.innerHTML = `
                <i class="fas fa-drone"></i>
                <span class="drone-name">@${droneName}</span>
                <button class="remove-drone-btn" data-drone="${droneName}" data-type="drone">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Add hover effect for close button
            droneTag.addEventListener('mouseenter', () => {
                const closeBtn = droneTag.querySelector('.remove-drone-btn');
                if (closeBtn) closeBtn.style.opacity = '1';
            });
            
            droneTag.addEventListener('mouseleave', () => {
                const closeBtn = droneTag.querySelector('.remove-drone-btn');
                if (closeBtn) closeBtn.style.opacity = '0.5';
            });
            
            // Add click handler for remove button
            const removeBtn = droneTag.querySelector('.remove-drone-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.removeContextDrone(droneName);
                });
            }
            
            this.contextWaypointsContainer.appendChild(droneTag);
        });
    }

    getSelectedContextWaypoints() {
        return this.selectedContextWaypoints;
    }

    clearSelectedContextWaypoints() {
        this.selectedContextWaypoints = [];
        this.updateContextWaypointsDisplay();
    }

    // Drone context management methods
    addContextDrone(droneName) {
        if (!this.selectedContextDrones.includes(droneName)) {
            this.selectedContextDrones.push(droneName);
            this.updateContextWaypointsDisplay(); // Using same display for both waypoints and drones
            console.log('Added context drone:', droneName);
            console.log('Current context drones:', this.selectedContextDrones);
        }
    }

    removeContextDrone(droneName) {
        const index = this.selectedContextDrones.indexOf(droneName);
        if (index > -1) {
            this.selectedContextDrones.splice(index, 1);
            this.updateContextWaypointsDisplay();
            console.log('Removed context drone:', droneName);
            console.log('Current context drones:', this.selectedContextDrones);
        }
    }

    getSelectedContextDrones() {
        return this.selectedContextDrones;
    }

    clearSelectedContextDrones() {
        this.selectedContextDrones = [];
        this.updateContextWaypointsDisplay();
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