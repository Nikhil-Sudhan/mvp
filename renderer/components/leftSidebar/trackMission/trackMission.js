class TrackMission {
    constructor() {
        console.log('Track Mission initializing...');
        
        this.currentPage = 1;
        this.itemsPerPage = 5;
        this.missions = []; // Empty missions array - no sample data
        this.waypoints = []; // Array to store waypoints from AI agent
        this.selectedWaypoints = []; // Array to store selected waypoint IDs
        
        this.initializeEventListeners();
        this.updateMissionTable();
        this.updateWaypointsList();
        
        console.log('Track Mission initialized successfully');
    }

    initializeEventListeners() {
        // Pagination event listeners
        document.addEventListener('click', (e) => {
            // Only handle clicks when track mission panel is active
            if (!document.querySelector('.track-mission-panel')) return;
            
            if (e.target.closest('.page-btn.prev')) {
                this.previousPage();
            } else if (e.target.closest('.page-btn.next')) {
                this.nextPage();
            } else if (e.target.closest('.page-btn') && !e.target.closest('.prev') && !e.target.closest('.next')) {
                const pageNum = parseInt(e.target.textContent);
                if (pageNum) {
                    this.goToPage(pageNum);
                }
            }
        });

        // Action menu event listeners
        document.addEventListener('click', (e) => {
            if (!document.querySelector('.track-mission-panel')) return;
            
            if (e.target.closest('.action-menu-btn')) {
                this.showActionMenu(e.target.closest('.action-menu-btn'));
            }
        });

        // Mission control event listeners
        document.addEventListener('click', (e) => {
            if (!document.querySelector('.track-mission-panel')) return;
            
            if (e.target.closest('#start-mission')) {
                this.startMission();
            } else if (e.target.closest('#pause-mission')) {
                this.pauseMission();
            } else if (e.target.closest('#stop-mission')) {
                this.stopMission();
            } else if (e.target.closest('#resume-mission')) {
                this.resumeMission();
            }
        });

        // Waypoint action listeners
        document.addEventListener('click', (e) => {
            if (!document.querySelector('.track-mission-panel')) return;
            
            if (e.target.closest('#add-waypoint')) {
                this.showAddWaypointModal();
            } else if (e.target.closest('#clear-waypoints')) {
                this.clearAllWaypoints();
            } else if (e.target.closest('#send-waypoints')) {
                this.showSendWaypointsModal();
            } else if (e.target.closest('.waypoint-select-btn')) {
                const waypointId = e.target.closest('.waypoint-select-btn').dataset.waypointId;
                this.toggleWaypointSelection(waypointId);
            }
        });
    }

    updateMissionTable() {
        const tableBody = document.getElementById('mission-table-body');
        if (!tableBody) return;

        if (this.missions.length === 0) {
            // Show empty state
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                        No mission data available
                    </td>
                </tr>
            `;
            this.updatePagination();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.missions.slice(startIndex, endIndex);

        tableBody.innerHTML = pageData.map(mission => `
            <tr data-mission-id="${mission.id}">
                <td title="${mission.id}">${mission.id}</td>
                <td title="${mission.name}">${mission.name}</td>
                <td><span class="status-badge ${mission.status.toLowerCase()}">${mission.status}</span></td>
                <td title="${mission.payload}">${mission.payload}</td>
                <td title="${mission.battery}">${mission.battery}</td>
                <td title="${mission.arrivalTime}">${mission.arrivalTime}</td>
                <td><button class="action-menu-btn"><i class="fas fa-ellipsis-v"></i></button></td>
            </tr>
        `).join('');

        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.max(1, Math.ceil(this.missions.length / this.itemsPerPage));
        const pagination = document.querySelector('.track-mission-panel .pagination');
        if (!pagination) return;

        // Clear existing page buttons
        const pageButtons = pagination.querySelectorAll('.page-btn:not(.prev):not(.next)');
        pageButtons.forEach(btn => btn.remove());

        // Add new page buttons
        const nextBtn = pagination.querySelector('.page-btn.next');
        for (let i = 1; i <= Math.min(totalPages, 3); i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
            btn.textContent = i;
            pagination.insertBefore(btn, nextBtn);
        }

        // Update prev/next button states
        const prevBtn = pagination.querySelector('.page-btn.prev');
        const nextBtnElement = pagination.querySelector('.page-btn.next');
        
        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtnElement) nextBtnElement.disabled = this.currentPage === totalPages || this.missions.length === 0;
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateMissionTable();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.missions.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.updateMissionTable();
        }
    }

    goToPage(pageNum) {
        const totalPages = Math.max(1, Math.ceil(this.missions.length / this.itemsPerPage));
        if (pageNum >= 1 && pageNum <= totalPages) {
            this.currentPage = pageNum;
            this.updateMissionTable();
        }
    }

    showActionMenu(button) {
        // Create a simple context menu (placeholder for now)
        const rect = button.getBoundingClientRect();
        console.log(`Action menu for mission at position: ${rect.left}, ${rect.top}`);
        // In a real implementation, this would show a dropdown menu
    }

    // Mission control methods
    startMission() {
        console.log('Starting mission...');
        // Implementation for starting mission
    }

    pauseMission() {
        console.log('Pausing mission...');
        // Implementation for pausing mission
    }

    stopMission() {
        console.log('Stopping mission...');
        // Implementation for stopping mission
    }

    resumeMission() {
        console.log('Resuming mission...');
        // Implementation for resuming mission
    }

    // Waypoint management methods
    updateWaypointsList(waypoints = null) {
        if (waypoints !== null) {
            this.waypoints = waypoints;
        }

        const waypointsTableBody = document.getElementById('waypoints-table-body');
        const waypointsTable = document.getElementById('waypoints-table');
        const emptyWaypoints = document.getElementById('empty-waypoints');
        
        if (!waypointsTableBody || !waypointsTable || !emptyWaypoints) return;

        // Clear existing waypoints
        waypointsTableBody.innerHTML = '';

        if (this.waypoints.length === 0) {
            waypointsTable.style.display = 'none';
            emptyWaypoints.style.display = 'block';
            return;
        }

        // Show table and hide empty state
        waypointsTable.style.display = 'table';
        emptyWaypoints.style.display = 'none';

        // Add waypoints to the table
        this.waypoints.forEach((waypoint, index) => {
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
                    <div class="coordinates">
                        ${waypoint.latitude.toFixed(6)}, ${waypoint.longitude.toFixed(6)}
                    </div>
                </td>
                <td>
                    <div class="altitude">${waypoint.altitude}m</div>
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

        // Add event listeners for the new waypoints
        this.addWaypointEventListeners();

        // Update waypoint actions
        this.updateWaypointActions();
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

    deleteWaypoint(waypointId) {
        if (!confirm('Are you sure you want to delete this waypoint?')) {
            return;
        }

        // Remove from waypoints array
        this.waypoints = this.waypoints.filter(w => w.id !== waypointId);
        
        // Remove from selected waypoints
        this.selectedWaypoints = this.selectedWaypoints.filter(id => id !== waypointId);
        
        // Update the display
        this.updateWaypointsList();
        
        console.log(`Deleted waypoint: ${waypointId}`);
    }

    toggleWaypointSelection(waypointId) {
        const index = this.selectedWaypoints.indexOf(waypointId);
        if (index > -1) {
            this.selectedWaypoints.splice(index, 1);
        } else {
            this.selectedWaypoints.push(waypointId);
        }
        
        // Update UI
        this.updateWaypointsList();
    }

    updateWaypointActions() {
        const waypointActions = document.querySelector('.waypoint-actions');
        if (!waypointActions) return;

        // Update or add send waypoints button
        let sendButton = waypointActions.querySelector('#send-waypoints');
        if (!sendButton) {
            sendButton = document.createElement('button');
            sendButton.id = 'send-waypoints';
            sendButton.className = 'waypoint-btn';
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send to Backend';
            waypointActions.appendChild(sendButton);
        }

        // Enable/disable based on selection
        sendButton.disabled = this.selectedWaypoints.length === 0;
    }

    showAddWaypointModal() {
        // This could open a modal to manually add waypoints
        console.log('Add waypoint modal - not implemented yet');
    }

    clearAllWaypoints() {
        if (confirm('Are you sure you want to clear all waypoints?')) {
            this.waypoints = [];
            this.selectedWaypoints = [];
            this.updateWaypointsList();
            
            // Also clear from AI agent
            if (window.AIAgent) {
                window.AIAgent.clearSelectedWaypoints();
            }
        }
    }

    showSendWaypointsModal() {
        if (this.selectedWaypoints.length === 0) {
            alert('Please select at least one waypoint to send.');
            return;
        }

        const missionName = prompt('Enter a name for this mission:');
        if (!missionName) return;

        this.sendWaypointsToBackend(missionName);
    }

    async sendWaypointsToBackend(missionName) {
        try {
            // Get selected waypoints
            const selectedWaypoints = this.waypoints.filter(w => 
                this.selectedWaypoints.includes(w.id)
            );

            if (selectedWaypoints.length === 0) {
                throw new Error('No waypoints selected');
            }

            // Convert to backend format
            const waypointsData = selectedWaypoints.map(waypoint => ({
                lat: waypoint.latitude,
                lon: waypoint.longitude,
                alt: waypoint.altitude
            }));

            const payload = {
                "waypoints name": missionName,
                "waypoints": waypointsData
            };

            console.log('Sending waypoints to backend:', payload);

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
            console.log('Backend response:', result);

            // Show success message
            alert(`✅ Mission "${missionName}" saved successfully!\n\nResponse: ${JSON.stringify(result)}`);

            // Add to missions list
            this.addNewMission({
                id: Date.now().toString(),
                name: missionName,
                status: 'Saved',
                payload: `${selectedWaypoints.length} waypoints`,
                battery: '100%',
                arrivalTime: new Date().toLocaleString()
            });

        } catch (error) {
            console.error('Failed to send waypoints to backend:', error);
            alert(`❌ Failed to send waypoints: ${error.message}`);
        }
    }

    // Public methods for external API calls
    static getInstance() {
        return window.trackMissionInstance;
    }

    addNewMission(missionData) {
        this.missions.unshift(missionData);
        this.updateMissionTable();
    }

    updateMission(missionId, updateData) {
        const mission = this.missions.find(m => m.id === missionId);
        if (mission) {
            Object.assign(mission, updateData);
            this.updateMissionTable();
        }
    }

    getMissionById(missionId) {
        return this.missions.find(m => m.id === missionId);
    }

    clearAllMissions() {
        this.missions = [];
        this.currentPage = 1;
        this.updateMissionTable();
    }

    loadMissions(missions) {
        this.missions = missions || [];
        this.currentPage = 1;
        this.updateMissionTable();
    }

    // Waypoint methods for external access
    getSelectedWaypoints() {
        return this.waypoints.filter(w => this.selectedWaypoints.includes(w.id));
    }

    addWaypoints(waypoints) {
        // Add default names to waypoints that don't have names
        const waypointsWithNames = waypoints.map((waypoint, index) => {
            if (!waypoint.name) {
                const existingCount = this.waypoints.length;
                waypoint.name = `Waypoint#${existingCount + index + 1}`;
            }
            return waypoint;
        });
        
        this.waypoints = [...this.waypoints, ...waypointsWithNames];
        this.updateWaypointsList();
    }

    removeWaypoints(waypointIds) {
        this.waypoints = this.waypoints.filter(w => !waypointIds.includes(w.id));
        this.selectedWaypoints = this.selectedWaypoints.filter(id => !waypointIds.includes(id));
        this.updateWaypointsList();
    }
}

// Initialize track mission when loaded
if (typeof window !== 'undefined') {
    // Function to initialize track mission
    function initializeTrackMission() {
        if (window.trackMissionInstance) {
            return; // Already initialized
        }
        
        // Check if track mission elements exist
        const trackMissionPanel = document.querySelector('.track-mission-panel');
        if (trackMissionPanel) {
            window.trackMissionInstance = new TrackMission();
        } else {
            // If track mission elements don't exist yet, try again in 100ms
            setTimeout(initializeTrackMission, 100);
        }
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTrackMission);
    } else {
        initializeTrackMission();
    }
    
    // Also try to initialize when the script loads (for dynamic loading)
    setTimeout(initializeTrackMission, 50);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackMission;
} 