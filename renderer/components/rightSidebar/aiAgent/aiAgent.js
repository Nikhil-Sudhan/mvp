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
        
        // Force immediate setup
        setTimeout(() => {
            this.init();
        }, 100);
    }

    async init() {
        try {
            // Initialize API and storage
            this.droneCommandAPI = new DroneCommandAPI();
            this.waypointStorage = new WaypointStorage();
            
            // Load existing waypoints
            this.waypoints = await this.waypointStorage.loadWaypoints();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update waypoints list
            this.updateWaypointsList();
            
            // Force update after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.updateWaypointsList();
                
                // Initialize default selections
                this.selectMode('surveillance');
                this.selectModel('auto');
                
                // Initialize start button state
                this.showStartButton();
            }, 500);
            
        } catch (error) {
            console.error('Failed to initialize AI Agent:', error);
        }
    }

    setupEventListeners() {
        // Chat input - send on Enter
        const chatInput = document.getElementById('chat-input');
        const startButton = document.getElementById('start-button');
        const stopButton = document.getElementById('stop-button');

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Update start button state based on input
            chatInput.addEventListener('input', () => {
                this.updateStartButtonState();
            });
        }

        // Start button - send message
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Stop button - stop current operation
        if (stopButton) {
            stopButton.addEventListener('click', () => {
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
                this.toggleContextDropdown();
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
            modeDropdownBtn.addEventListener('click', () => {
                this.toggleModeDropdown();
            });
        }

        // Mode dropdown items
        const modeDropdownItems = document.querySelectorAll('.mode-item');
        modeDropdownItems.forEach(item => {
            item.addEventListener('click', () => {
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
            modelDropdownBtn.addEventListener('click', () => {
                this.toggleModelDropdown();
            });
        }

        // Model dropdown items
        const modelDropdownItems = document.querySelectorAll('.model-item');
        modelDropdownItems.forEach(item => {
            item.addEventListener('click', () => {
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
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;
        
        // Switch to stop button
        this.showStopButton();
        
        // Add user message
        this.addUserMessage(message);
        
        // Clear input
        input.value = '';
        
        // Prepare command with mode and model context
        let command = message;
        if (this.selectedMode) {
            command = `[${this.selectedMode.toUpperCase()}] ${command}`;
        }
        if (this.selectedModel && this.selectedModel !== 'auto') {
            command = `[${this.selectedModel.toUpperCase()}] ${command}`;
        }
        
        // Send to API
        await this.sendToAPI(command);
        
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
        
        if (!input || !startButton) return;
        
        const hasText = input.value.trim().length > 0;
        startButton.disabled = !hasText;
        startButton.style.opacity = hasText ? '1' : '0.5';
        startButton.style.cursor = hasText ? 'pointer' : 'not-allowed';
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

        try {
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

            // Create waypoint object
            const waypoint = {
                id: Date.now().toString(),
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
            
            // Save to storage
            await this.waypointStorage.saveWaypoints(this.waypoints);
            console.log('Saved to storage');
            
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
        const saveEdit = () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                this.updateWaypointName(waypointId, newName);
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

    updateWaypointName(waypointId, newName) {
        const waypoint = this.waypoints.find(w => w.id === waypointId);
        if (waypoint) {
            waypoint.name = newName;
            console.log(`Updated waypoint ${waypointId} name to: ${newName}`);
            
            // Update the display
            const nameElement = document.querySelector(`.waypoint-name[data-waypoint-id="${waypointId}"]`);
            if (nameElement) {
                nameElement.textContent = newName;
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
            // Remove from array
            this.waypoints = this.waypoints.filter(w => w.id !== waypointId);
            
            // Remove from selected
            this.selectedWaypoints = this.selectedWaypoints.filter(id => id !== waypointId);
            
            // Save to storage
            await this.waypointStorage.saveWaypoints(this.waypoints);
            
            // Update UI
            this.updateWaypointsList();
            
            // Update track mission with all waypoints
            this.updateTrackMissionWithAllWaypoints();
            
            this.addAIMessage('✅ Waypoint deleted successfully!');
            
        } catch (error) {
            console.error('Failed to delete waypoint:', error);
            this.addAIMessage(`❌ Failed to delete waypoint: ${error.message}`);
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

        const payload = {
            "waypoints name": missionName,
            "waypoints": waypointsData
        };

        try {
            const response = await fetch('http://localhost:8001/waypoints', {
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
    }

    // Mode selection methods
    toggleModeDropdown() {
        const modeDropdownBtn = document.getElementById('mode-dropdown-btn');
        const modeDropdownMenu = document.getElementById('mode-dropdown-menu');
        
        if (modeDropdownBtn && modeDropdownMenu) {
            if (modeDropdownMenu.classList.contains('show')) {
                this.hideModeDropdown();
            } else {
                this.showModeDropdown();
            }
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
        const modelDropdownBtn = document.getElementById('model-dropdown-btn');
        const modelDropdownMenu = document.getElementById('model-dropdown-menu');
        
        if (modelDropdownBtn && modelDropdownMenu) {
            if (modelDropdownMenu.classList.contains('show')) {
                this.hideModelDropdown();
            } else {
                this.showModelDropdown();
            }
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

} // End of AIAgent class definition guard 