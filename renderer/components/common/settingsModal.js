class SettingsModal {
    constructor() {
        this.modal = null;
        this.currentSection = 'general';
        this.settings = this.loadSettings();
        this.initialize();
    }

    async initialize() {
        await this.loadModalHTML();
        this.setupEventListeners();
        this.loadCurrentSettings();
    }

    async loadModalHTML() {
        try {
            const response = await fetch('components/common/settingsModal.html');
            const html = await response.text();
            const container = document.getElementById('settingsModalContainer');
            if (container) {
                container.innerHTML = html;
                this.modal = document.getElementById('settingsModal');
            }
        } catch (error) {
            console.error('Failed to load settings modal HTML:', error);
        }
    }

    setupEventListeners() {
        // Settings button in title bar
        const settingsBtn = document.querySelector('.title-btn[title="Settings"]');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.open());
        }

        // Close button
        const closeBtn = document.getElementById('closeSettings');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelSettings');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Save button
        const saveBtn = document.getElementById('saveSettings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Reset button
        const resetBtn = document.getElementById('resetSettings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Navigation
        const navItems = document.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.showSection(section);
            });
        });

        // Close on backdrop click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.classList.contains('show')) {
                this.close();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            this.loadCurrentSettings();
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.settings-section');
        sections.forEach(section => section.classList.remove('active'));

        // Remove active from all nav items
        const navItems = document.querySelectorAll('.settings-nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Activate nav item
        const targetNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }

        this.currentSection = sectionName;
    }

    loadCurrentSettings() {
        // Load settings into form fields
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else {
                    element.value = this.settings[key];
                }
            }
        });
    }

    saveSettings() {
        // Collect all settings from form
        const newSettings = {};
        
        // General settings
        newSettings.autoSaveInterval = parseInt(document.getElementById('autoSaveInterval')?.value || 5);
        newSettings.defaultMapView = document.getElementById('defaultMapView')?.value || 'satellite';
        newSettings.enableNotifications = document.getElementById('enableNotifications')?.checked || false;
        newSettings.enableSoundEffects = document.getElementById('enableSoundEffects')?.checked || false;

        // Appearance settings
        newSettings.theme = document.getElementById('theme')?.value || 'dark';
        newSettings.uiScale = parseFloat(document.getElementById('uiScale')?.value || 1.0);
        newSettings.sidebarPosition = document.getElementById('sidebarPosition')?.value || 'left';

        // Drone settings
        newSettings.defaultConnection = document.getElementById('defaultConnection')?.value || 'usb';
        newSettings.defaultBaudRate = parseInt(document.getElementById('defaultBaudRate')?.value || 57600);
        newSettings.maxAltitude = parseInt(document.getElementById('maxAltitude')?.value || 120);
        newSettings.maxSpeed = parseFloat(document.getElementById('maxSpeed')?.value || 15);

        // Map settings
        newSettings.mapProvider = document.getElementById('mapProvider')?.value || 'cesium';
        newSettings.defaultZoom = parseInt(document.getElementById('defaultZoom')?.value || 10);
        newSettings.showGrid = document.getElementById('showGrid')?.checked || false;
        newSettings.showCoordinates = document.getElementById('showCoordinates')?.checked || false;

        // Weather settings
        newSettings.weatherUpdateInterval = parseInt(document.getElementById('weatherUpdateInterval')?.value || 10);
        newSettings.temperatureUnit = document.getElementById('temperatureUnit')?.value || 'celsius';
        newSettings.windSpeedUnit = document.getElementById('windSpeedUnit')?.value || 'mph';
        newSettings.showWeatherAlerts = document.getElementById('showWeatherAlerts')?.checked || false;

        // Advanced settings
        newSettings.logLevel = document.getElementById('logLevel')?.value || 'info';
        newSettings.enableTelemetry = document.getElementById('enableTelemetry')?.checked || false;
        newSettings.enablePerformanceMode = document.getElementById('enablePerformanceMode')?.checked || false;

        // Save to localStorage
        this.settings = newSettings;
        localStorage.setItem('avionixis-settings', JSON.stringify(newSettings));

        // Apply settings
        this.applySettings(newSettings);

        // Show success message
        this.showNotification('Settings saved successfully!', 'success');

        // Close modal
        this.close();
    }

    applySettings(settings) {
        // Apply theme
        if (settings.theme) {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }

        // Apply UI scale
        if (settings.uiScale) {
            document.documentElement.style.fontSize = `${settings.uiScale * 16}px`;
        }

        // Apply sidebar position
        if (settings.sidebarPosition) {
            // This would need to be implemented based on your sidebar structure
            console.log('Sidebar position:', settings.sidebarPosition);
        }

        // Apply weather settings
        if (window.weatherService && settings.weatherUpdateInterval) {
            // Update weather service interval
            console.log('Weather update interval:', settings.weatherUpdateInterval);
        }

        // Apply drone settings
        if (settings.maxAltitude || settings.maxSpeed) {
            // Update drone configuration
            console.log('Drone settings updated:', settings);
        }

        // Apply map settings
        if (settings.mapProvider || settings.defaultZoom) {
            // Update map configuration
            console.log('Map settings updated:', settings);
        }

        // Apply advanced settings
        if (settings.logLevel) {
            console.log('Log level set to:', settings.logLevel);
        }
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            this.settings = this.getDefaultSettings();
            this.loadCurrentSettings();
            this.showNotification('Settings reset to defaults!', 'info');
        }
    }

    getDefaultSettings() {
        return {
            // General
            autoSaveInterval: 5,
            defaultMapView: 'satellite',
            enableNotifications: true,
            enableSoundEffects: true,

            // Appearance
            theme: 'dark',
            uiScale: 1.0,
            sidebarPosition: 'left',

            // Drone
            defaultConnection: 'usb',
            defaultBaudRate: 57600,
            maxAltitude: 120,
            maxSpeed: 15,

            // Map
            mapProvider: 'cesium',
            defaultZoom: 10,
            showGrid: true,
            showCoordinates: true,

            // Weather
            weatherUpdateInterval: 10,
            temperatureUnit: 'celsius',
            windSpeedUnit: 'mph',
            showWeatherAlerts: true,

            // Advanced
            logLevel: 'info',
            enableTelemetry: true,
            enablePerformanceMode: false
        };
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('avionixis-settings');
            if (saved) {
                return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        return this.getDefaultSettings();
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `settings-notification ${type}`;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // Public method to get current settings
    getSettings() {
        return this.settings;
    }

    // Public method to update a specific setting
    updateSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('avionixis-settings', JSON.stringify(this.settings));
        this.applySettings(this.settings);
    }
}

// Initialize settings modal when DOM is ready
let settingsModal;
function initializeSettingsModal() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            settingsModal = new SettingsModal();
            window.settingsModal = settingsModal;
        });
    } else {
        settingsModal = new SettingsModal();
        window.settingsModal = settingsModal;
    }
}

// Call initialization
initializeSettingsModal();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsModal;
} 