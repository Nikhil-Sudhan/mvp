class TrackMission {
    constructor() {
        // Track Mission initializing
        
        this.currentPage = 1;
        this.itemsPerPage = 5;
        this.missions = []; // Empty missions array - no sample data
        
        this.initializeEventListeners();
        this.updateMissionTable();
        
        // Track Mission initialized successfully
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
        // Action menu for mission
        // In a real implementation, this would show a dropdown menu
    }

    // Mission control methods
    startMission() {
        // Starting mission
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