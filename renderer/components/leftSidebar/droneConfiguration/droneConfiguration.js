class DroneConfiguration {
    constructor() {
        this.initializeEventListeners();
        this.loadConfiguration();
    }

    initializeEventListeners() {
        document.getElementById('save-config')?.addEventListener('click', () => this.saveConfiguration());
        document.getElementById('load-config')?.addEventListener('click', () => this.loadConfiguration());
        document.getElementById('reset-config')?.addEventListener('click', () => this.resetConfiguration());
        
        // Auto-save on changes
        const inputs = document.querySelectorAll('#connection-type, #connection-address, #baud-rate, #max-altitude, #max-speed, #rth-altitude, #auto-land-battery');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.autoSave());
        });

        const checkboxes = document.querySelectorAll('#geofence, #obstacle-avoidance, #auto-rth, #motor-cutoff');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.autoSave());
        });
    }

    getConfiguration() {
        return {
            connection: {
                type: document.getElementById('connection-type')?.value || 'usb',
                address: document.getElementById('connection-address')?.value || '',
                baudRate: document.getElementById('baud-rate')?.value || '57600'
            },
            flight: {
                maxAltitude: parseInt(document.getElementById('max-altitude')?.value || '120'),
                maxSpeed: parseFloat(document.getElementById('max-speed')?.value || '15'),
                rthAltitude: parseInt(document.getElementById('rth-altitude')?.value || '50'),
                autoLandBattery: parseInt(document.getElementById('auto-land-battery')?.value || '20')
            },
            safety: {
                geofence: document.getElementById('geofence')?.checked || false,
                obstacleAvoidance: document.getElementById('obstacle-avoidance')?.checked || false,
                autoRth: document.getElementById('auto-rth')?.checked || false,
                motorCutoff: document.getElementById('motor-cutoff')?.checked || false
            }
        };
    }

    setConfiguration(config) {
        // Connection settings
        if (config.connection) {
            document.getElementById('connection-type').value = config.connection.type || 'usb';
            document.getElementById('connection-address').value = config.connection.address || '';
            document.getElementById('baud-rate').value = config.connection.baudRate || '57600';
        }

        // Flight parameters
        if (config.flight) {
            document.getElementById('max-altitude').value = config.flight.maxAltitude || 120;
            document.getElementById('max-speed').value = config.flight.maxSpeed || 15;
            document.getElementById('rth-altitude').value = config.flight.rthAltitude || 50;
            document.getElementById('auto-land-battery').value = config.flight.autoLandBattery || 20;
        }

        // Safety settings
        if (config.safety) {
            document.getElementById('geofence').checked = config.safety.geofence || false;
            document.getElementById('obstacle-avoidance').checked = config.safety.obstacleAvoidance || false;
            document.getElementById('auto-rth').checked = config.safety.autoRth || false;
            document.getElementById('motor-cutoff').checked = config.safety.motorCutoff || false;
        }
    }

    saveConfiguration() {
        const config = this.getConfiguration();
        localStorage.setItem('droneConfig', JSON.stringify(config));
        this.showNotification('Configuration saved successfully!', 'success');
    }

    loadConfiguration() {
        const saved = localStorage.getItem('droneConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.setConfiguration(config);
                this.showNotification('Configuration loaded successfully!', 'info');
            } catch (error) {
                this.showNotification('Error loading configuration!', 'error');
            }
        } else {
            this.resetConfiguration();
        }
    }

    resetConfiguration() {
        const defaultConfig = {
            connection: { type: 'usb', address: '', baudRate: '57600' },
            flight: { maxAltitude: 120, maxSpeed: 15, rthAltitude: 50, autoLandBattery: 20 },
            safety: { geofence: true, obstacleAvoidance: true, autoRth: true, motorCutoff: false }
        };
        
        this.setConfiguration(defaultConfig);
        this.showNotification('Configuration reset to defaults!', 'warning');
    }

    autoSave() {
        // Auto-save after 2 seconds of no changes
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveConfiguration();
        }, 2000);
    }

    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.querySelector('.config-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'config-notification';
            document.querySelector('.config-content').prepend(notification);
        }

        notification.textContent = message;
        notification.className = `config-notification ${type}`;
        notification.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    // Public method to get current configuration
    static getCurrentConfig() {
        return new DroneConfiguration().getConfiguration();
    }

    // Validate configuration before applying
    validateConfiguration(config) {
        const errors = [];
        
        if (config.flight.maxAltitude < 1 || config.flight.maxAltitude > 500) {
            errors.push('Max altitude must be between 1-500 meters');
        }
        
        if (config.flight.maxSpeed < 1 || config.flight.maxSpeed > 25) {
            errors.push('Max speed must be between 1-25 m/s');
        }

        if (config.flight.autoLandBattery < 10 || config.flight.autoLandBattery > 50) {
            errors.push('Auto land battery must be between 10-50%');
        }

        return errors;
    }
}

// Initialize configuration when loaded
if (typeof window !== 'undefined') {
    window.droneConfigInstance = new DroneConfiguration();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DroneConfiguration;
} 