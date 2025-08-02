class SidebarManager {
    constructor() {
        this.currentLeftPanel = null;
        this.currentRightPanel = null;
        this.initialize();
    }

    initialize() {
        this.createSidebarStructure();
        this.setupEventListeners();
        this.loadCommonStyles();
    }

    createSidebarStructure() {
        const leftSidebar = document.createElement('div');
        leftSidebar.className = 'sidebar left-sidebar';
        leftSidebar.id = 'leftSidebar';

        const leftToggle = document.createElement('div');
        leftToggle.className = 'sidebar-toggle left-toggle';
        leftToggle.innerHTML = `
            <div class="sidebar-icons">
                <div class="logo-icon" id="logo-section">
                    <i class="fas fa-drone"></i>
                </div>
                <button class="sidebar-icon" title="Dashboard" data-panel="dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                </button>
                <button class="sidebar-icon" title="Drone Configuration" data-panel="droneConfiguration">
                    <i class="fas fa-cogs"></i>
                </button>
                <button class="sidebar-icon" title="Track Mission" data-panel="trackMission">
                    <i class="fas fa-route"></i>
                </button>
                <button class="sidebar-icon" title="Help" data-panel="help">
                    <i class="fas fa-question-circle"></i>
                </button>
                <button class="sidebar-icon" title="Profile" data-panel="profile">
                    <i class="fas fa-user"></i>
                </button>
            </div>
        `;

        const leftContent = document.createElement('div');
        leftContent.className = 'sidebar-content';
        leftContent.id = 'leftSidebarContent';

        leftSidebar.appendChild(leftToggle);
        leftSidebar.appendChild(leftContent);

        const rightSidebar = document.createElement('div');
        rightSidebar.className = 'sidebar right-sidebar';
        rightSidebar.id = 'rightSidebar';

        const rightToggle = document.createElement('div');
        rightToggle.className = 'sidebar-toggle right-toggle';
        rightToggle.innerHTML = `
            <div class="sidebar-icons">
                <button class="sidebar-icon" title="AI Agent" data-panel="aiAgent">
                    <i class="fas fa-robot"></i> 
                </button>
                <button class="sidebar-icon" title="Telemetry" data-panel="telemetry">
                    <i class="fas fa-chart-line"></i>
                </button>
            </div>
        `;

        const rightContent = document.createElement('div');
        rightContent.className = 'sidebar-content';
        rightContent.id = 'rightSidebarContent';

        rightSidebar.appendChild(rightToggle);
        rightSidebar.appendChild(rightContent);

        const mainContainer = document.querySelector('.main-container') || document.body;
        mainContainer.insertBefore(leftSidebar, mainContainer.firstChild);
        mainContainer.appendChild(rightSidebar);
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const leftIcon = e.target.closest('.left-sidebar .sidebar-icon');
            if (leftIcon) {
                const panel = leftIcon.dataset.panel;
                if (panel) {
                    this.toggleLeftSidebar(panel);
                }
            }

            const rightIcon = e.target.closest('.right-sidebar .sidebar-icon');
            if (rightIcon) {
                const panel = rightIcon.dataset.panel;
                if (panel) {
                    this.toggleRightSidebar(panel);
                }
            }

            if (e.target.closest('#logo-section')) {
                this.toggleSidebar('left');
            }
        });
    }

    loadCommonStyles() {
        if (!document.querySelector('link[href*="sidebar.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'components/common/sidebar.css';
            document.head.appendChild(link);
        }
    }

    async toggleLeftSidebar(panelName) {
        const sidebar = document.getElementById('leftSidebar');
        const isExpanded = sidebar.classList.contains('expanded');
        const isSamePanel = this.currentLeftPanel === panelName;

        if (isExpanded && isSamePanel) {
            sidebar.classList.remove('expanded');
            sidebar.classList.remove('drone-config-extended', 'track-mission-extended');
            sidebar.style.removeProperty('width');
            sidebar.style.removeProperty('max-width');
            this.currentLeftPanel = null;
        } else {
            sidebar.classList.add('expanded');
            sidebar.classList.remove('drone-config-extended', 'track-mission-extended');
            
            if (panelName === 'droneConfiguration') {
                sidebar.classList.add('drone-config-extended');
            } else if (panelName === 'trackMission') {
                sidebar.classList.add('track-mission-extended');
            }
            
            await this.showLeftPanel(panelName);
            setTimeout(() => this.adjustExtendedSidebarWidth(), 100);
        }
        
        this.updateActiveIcons('left', panelName);
    }

    async toggleRightSidebar(panelName) {
        const sidebar = document.getElementById('rightSidebar');
        const isExpanded = sidebar.classList.contains('expanded');
        const isSamePanel = this.currentRightPanel === panelName;
    
        if (isExpanded && isSamePanel) {
            sidebar.classList.remove('expanded');
            document.body.classList.remove('right-sidebar-expanded');
            this.currentRightPanel = null;
        } else {
            sidebar.classList.add('expanded');
            document.body.classList.add('right-sidebar-expanded');
            await this.showRightPanel(panelName);
        }
    
        this.updateActiveIcons('right', panelName);
    }

    async showLeftPanel(panelName) {
        const content = document.getElementById('leftSidebarContent');
        const sidebar = document.getElementById('leftSidebar');
        
        if (sidebar) {
            sidebar.classList.add('expanded');
        }
        
        await this.loadPanelContent(content, 'leftSidebar', panelName);
        this.currentLeftPanel = panelName;
        this.updateActiveIcons('left', panelName);
    }

    async showRightPanel(panelName) {
        const content = document.getElementById('rightSidebarContent');
        await this.loadPanelContent(content, 'rightSidebar', panelName);
        this.currentRightPanel = panelName;
        
        // Initialize AIAgent when panel is loaded
        if (panelName === 'aiAgent') {
                        setTimeout(() => {
                if (window.AIAgent && !window.aiAgentInstance) {
                    window.aiAgentInstance = new window.AIAgent();
                } else if (!window.AIAgent) {
                    console.error('❌ AIAgent class not found when loading panel');
                }
            }, 200);
        }
    }

    async loadPanelContent(container, sideType, panelName) {
        container.innerHTML = '';

        const panelDiv = document.createElement('div');
        panelDiv.className = `panel ${panelName}-panel active`;
        panelDiv.id = `${panelName}-panel`;

        await this.loadHTML(panelDiv, `${sideType}/${panelName}/${panelName}.html`);
        this.loadCSS(`${sideType}/${panelName}/${panelName}.css`);
        this.loadJS(`${sideType}/${panelName}/${panelName}.js`);

        container.appendChild(panelDiv);
    }

    async loadHTML(container, path) {
        try {
            const response = await fetch(`components/${path}`);
            
            if (response.ok) {
                const html = await response.text();
                container.innerHTML = html;
            } else {
                const componentMap = {
                    'leftSidebar/dashboard/dashboard.html': this.getDashboardHTML(),
                    'leftSidebar/droneConfiguration/droneConfiguration.html': this.getDroneConfigHTML(),
                    'leftSidebar/trackMission/trackMission.html': this.getTrackMissionHTML(),
                    'leftSidebar/help/help.html': this.getHelpHTML(),
                    'leftSidebar/profile/profile.html': this.getProfileHTML(),
                    // Remove the fallback for aiAgent so it loads the actual file
                    'rightSidebar/telemetry/telemetry.html': this.getTelemetryHTML()
                };
                const fallbackHTML = componentMap[path] || `<div class="panel-placeholder">Component: ${path}</div>`;
                container.innerHTML = fallbackHTML;
            }
        } catch (error) {
            container.innerHTML = `<div class="panel-error">Error loading component: ${path}</div>`;
        }
    }

    loadCSS(path) {
        const id = `css-${path.replace(/[\/\.]/g, '-')}`;
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = `components/${path}`;
            document.head.appendChild(link);
        }
    }

    loadJS(path) {
        const id = `js-${path.replace(/[\/\.]/g, '-')}`;
        if (!document.getElementById(id)) {
            const script = document.createElement('script');
            script.id = id;
            script.src = `components/${path}`;
            document.head.appendChild(script);
        }
    }

    updateActiveIcons(side, panelName) {
        const sidebar = document.getElementById(`${side}Sidebar`);
        const icons = sidebar.querySelectorAll('.sidebar-icon');
        
        icons.forEach(icon => {
            icon.classList.toggle('active', icon.dataset.panel === panelName);
        });
    }

    toggleSidebar(side) {
        const sidebar = document.getElementById(`${side}Sidebar`);
        sidebar.classList.toggle('expanded');
    }

    getDashboardHTML() {
        return `
            <div class="dashboard-panel">
                <div class="panel-header">
                    <h3><i class="fas fa-tachometer-alt"></i> Dashboard</h3>
                </div>
                <div class="dashboard-content">
                    <div class="dashboard-greeting">
                        <h2>Hello <span id="user-name">User</span>, here's the daily stats.</h2>
                    </div>
                    <div class="mission-stats">
                        <div class="stat-card ongoing">
                            <div class="stat-header">
                                <span class="stat-label">Ongoing Missions</span>
                            </div>
                            <div class="stat-value" id="ongoing-missions">0</div>
                        </div>
                        <div class="stat-card returning">
                            <div class="stat-header">
                                <span class="stat-label">Returning to Base</span>
                            </div>
                            <div class="stat-value" id="returning-missions">0</div>
                        </div>
                        <div class="stat-card pending">
                            <div class="stat-header">
                                <span class="stat-label">Pending Missions</span>
                            </div>
                            <div class="stat-value" id="pending-missions">0</div>
                        </div>
                        <div class="stat-card completed">
                            <div class="stat-header">
                                <span class="stat-label">Completed missions</span>
                            </div>
                            <div class="stat-value" id="completed-missions">0</div>
                        </div>
                    </div>
                    <div class="weather-widget">
                        <div class="section-header">
                            <h4>Weather</h4>
                        </div>
                        <div class="weather-info">
                            <div class="weather-main">
                                <div class="weather-icon">
                                    <i class="fas fa-cloud-sun"></i>
                                </div>
                                <div class="temperature">--°</div>
                            </div>
                            <div class="location">
                                <select id="location-select">
                                    <option>Select Location</option>
                                    <option>Aundh, Pune</option>
                                    <option>Mumbai</option>
                                    <option>Delhi</option>
                                </select>
                            </div>
                            <div class="weather-details">
                                <div class="weather-conditions">
                                    <div class="condition-item">
                                        <i class="fas fa-sun"></i>
                                        <span>Condition: --</span>
                                    </div>
                                    <div class="condition-item">
                                        <i class="fas fa-wind"></i>
                                        <span>Wind speed: -- mph</span>
                                    </div>
                                </div>
                                <div class="risk-assessment">
                                    <div class="risk-level">
                                        <span>Risk Level</span>
                                        <span class="risk-indicator safe">--</span>
                                    </div>
                                    <div class="risk-details">
                                        <span>Risk of Overheating: --%</span>
                                        <span>Humidity: --%</span>
                                    </div>
                                </div>
                            </div>
                            <div class="forecast">
                                <h5>Forecast <span>--</span></h5>
                                <div class="forecast-hours">
                                    <div class="hour-item">
                                        <span>--</span>
                                        <span class="temp">--°</span>
                                    </div>
                                    <div class="hour-item">
                                        <span>--</span>
                                        <span class="temp">--°</span>
                                    </div>
                                    <div class="hour-item">
                                        <span>--</span>
                                        <span class="temp">--°</span>
                                    </div>
                                    <div class="hour-item">
                                        <span>--</span>
                                        <span class="temp">--°</span>
                                    </div>
                                    <div class="hour-item">
                                        <span>--</span>
                                        <span class="temp">--°</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getDroneConfigHTML() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-cogs"></i> Drone Configuration</h3>
            </div>
            <div class="config-content">
                <p>Drone Configuration component loaded successfully!</p>
            </div>
        `;
    }

    getTrackMissionHTML() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-route"></i> Track Mission</h3>
            </div>
            <div class="mission-content">
                <div class="mission-table-container">
                    <h4><i class="fas fa-table"></i> Mission Data</h4>
                    <table class="mission-table">
                        <thead>
                            <tr>
                                <th>Mission ID</th>
                                <th>Mission name</th>
                                <th>Status</th>
                                <th>Payload</th>
                                <th>Battery</th>
                                <th>Arrival Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="mission-table-body">
                        </tbody>
                    </table>
                </div>
                <p>Track Mission component loaded successfully!</p>
            </div>
        `;
    }

    getHelpHTML() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-question-circle"></i> Help & Support</h3>
            </div>
            <div class="help-content">
                <p>Help component loaded successfully!</p>
            </div>
        `;
    }

    getProfileHTML() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-user"></i> User Profile</h3>
            </div>
            <div class="profile-content">
                <p>Profile component loaded successfully!</p>
            </div>
        `;
    }

    getAIAgentHTML() {
        return `
            <div class="ai-agent-panel">
                <!-- Waypoints Section -->
                <div class="waypoints-section">
                    <div class="section-header">
                        <h4><i class="fas fa-map-marker-alt"></i> Waypoints</h4>
                    </div>
                    <div class="waypoints-container">
                        <div class="waypoints-table-container">
                            <table class="waypoints-table" id="waypoints-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Points</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="waypoints-table-body">
                                    <!-- Waypoints will be populated here -->
                                </tbody>
                            </table>
                            <div class="empty-state" id="empty-waypoints">
                                <i class="fas fa-map-marker-alt"></i>
                                <p>No waypoints created yet</p>
                                <span class="hint">Use the drawing tools on the map to create waypoints</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chat Section -->
                <div class="chat-section">
                    <div class="chat-messages" id="chat-messages">
                        <div class="message ai-message">
                            <div class="message-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="message-content">
                                <div class="message-text">
                                    Hello! Type any command and I'll send it to the backend.
                                </div>
                                <div class="message-time">Just now</div>
                            </div>
                        </div>
                    </div>

                <!-- Chat Input -->
                <div class="chat-input-area">
                    <div class="unified-input-container">
                        <!-- Top row with @ symbol -->
                        <div class="input-top-row">
                            <button class="context-button" id="context-button" title="Add Context">
                                <i class="fas fa-at"></i>
                            </button>
                            <span class="input-label">Add Context</span>
                        </div>
                        
                        <!-- Main input field with start/stop button -->
                        <div class="input-with-action-btn">
                            <input type="text" 
                                   class="main-chat-input" 
                                   id="chat-input" 
                                   placeholder="Plan, search, build anything">
                            <button class="start-btn" id="start-button" title="Send">
                                <i class="fas fa-arrow-right"></i>
                            </button>
                            <button class="stop-btn" id="stop-button" title="Stop" style="display: none;">
                                <i class="fas fa-square"></i>
                            </button>
                        </div>
                        
                        <!-- Bottom row with controls -->
                        <div class="input-bottom-controls">
                            <!-- Mode selection dropdown -->
                            <div class="mode-selector">
                                <button class="mode-btn" id="mode-dropdown-btn">
                                    <i class="fas fa-infinity"></i>
                                    <span id="selected-mode">Surveillance</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="mode-menu" id="mode-dropdown-menu">
                                    <div class="mode-item" data-mode="surveillance">
                                        <i class="fas fa-eye"></i>
                                        <span>Surveillance</span>
                                        <i class="fas fa-check"></i>
                                    </div>
                                    <div class="mode-item" data-mode="object-detection">
                                        <i class="fas fa-search"></i>
                                        <span>Object Detection</span>
                                        <i class="fas fa-check"></i>
                                    </div>
                                    <div class="mode-item" data-mode="3d-mapping">
                                        <i class="fas fa-cube"></i>
                                        <span>3D Mapping</span>
                                        <i class="fas fa-check"></i>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Right side controls -->
                            <div class="right-controls">
                                <!-- Model selection dropdown -->
                                <div class="model-selector">
                                    <button class="model-btn" id="model-dropdown-btn">
                                        <span id="selected-model">Auto</span>
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <div class="model-menu" id="model-dropdown-menu">
                                        <div class="model-item" data-model="auto">Auto</div>
                                        <div class="model-item" data-model="online">Online</div>
                                        <div class="model-item" data-model="offline">Offline</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Context dropdown -->
                    <div class="context-dropdown" id="context-dropdown">
                        <div class="context-section">
                            <h4>Waypoints</h4>
                            <div class="context-items" id="waypoints-context">
                                <!-- Waypoints will be populated here -->
                            </div>
                        </div>
                        <div class="context-section">
                            <h4>Drones</h4>
                            <div class="context-items" id="drones-context">
                                <!-- Drones will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Waypoint Save Modal -->
                <div class="modal-overlay" id="waypoint-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Save Waypoint</h3>
                        </div>
                        <div class="modal-body">
                            <p>Give your waypoint a name:</p>
                            <input type="text" 
                                   class="waypoint-input" 
                                   id="waypoint-input" 
                                   placeholder="e.g., home, landing-zone, survey-area">
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="cancel-waypoint">Cancel</button>
                            <button class="btn btn-primary" id="save-waypoint">Save Waypoint</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTelemetryHTML() {
        return `
            <div class="panel-header">
                <h3><i class="fas fa-chart-line"></i> Telemetry</h3>
            </div>
            <div class="telemetry-content">
                <p>Telemetry component loaded successfully!</p>
            </div>
        `;
    }

    adjustExtendedSidebarWidth() {
        const leftSidebar = document.getElementById('leftSidebar');
        const rightSidebar = document.getElementById('rightSidebar');
        
        if (!leftSidebar || !leftSidebar.classList.contains('expanded')) {
            return;
        }

        const isExtended = leftSidebar.classList.contains('drone-config-extended') || 
                          leftSidebar.classList.contains('track-mission-extended');
        
        if (isExtended) {
            const rightSidebarExpanded = rightSidebar && rightSidebar.classList.contains('expanded');
            
            // rightSidebarExpanded state
            
            let newWidth;
            if (rightSidebarExpanded) {
                // When right sidebar is expanded, it takes 320px total
                newWidth = `calc(100vm - 320px)`;
            } else {
                // When right sidebar is collapsed, it takes 50px total
                newWidth = `calc(100vm - 50px)`;
            }
            
            
            // Use setProperty with important priority to override CSS
            leftSidebar.style.setProperty('width', newWidth, 'important');
            leftSidebar.style.setProperty('max-width', 'none', 'important');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.sidebarManager = new SidebarManager();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarManager;
} 