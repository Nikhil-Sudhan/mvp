class StatusBarManager {
    constructor() {
        this.initializeWeatherUpdates();
        this.initializeWebSocketMonitoring();
        this.initializeLocationSettings();
    }

    initializeWeatherUpdates() {
        // Wait for weather service to be available
        const checkWeatherService = () => {
            if (window.weatherService) {
                window.weatherService.onWeatherUpdate((weatherData) => {
                    this.updateWeatherDisplay(weatherData);
                });
            } else {
                setTimeout(checkWeatherService, 100);
            }
        };
        checkWeatherService();
    }

    updateWeatherDisplay(weatherData) {
        if (!weatherData) return;

        // Update temperature in status bar
        const tempElement = document.querySelector('.temp-display');
        if (tempElement && weatherData.temperature) {
            tempElement.textContent = `Temp: ${weatherData.temperature}°C`;
        }

        // Update temperature icon
        const tempIcon = document.querySelector('.weather-status i');
        if (tempIcon && weatherData.icon) {
            tempIcon.className = this.getWeatherIconClass(weatherData.icon, weatherData.condition);
        }

        // Update weather condition
        const conditionElement = document.querySelector('.condition-display');
        if (conditionElement && weatherData.condition) {
            conditionElement.textContent = weatherData.condition;
        }

        // Update condition icon
        const conditionIcon = document.querySelector('.weather-condition i');
        if (conditionIcon && weatherData.icon) {
            conditionIcon.className = this.getWeatherIconClass(weatherData.icon, weatherData.condition);
        }

        // Add weather tooltip for more details
        this.updateWeatherTooltip(weatherData);
    }

    getWeatherIconClass(iconCode, condition) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '01n': 'fas fa-moon',
            '02d': 'fas fa-cloud-sun',
            '02n': 'fas fa-cloud-moon',
            '03d': 'fas fa-cloud',
            '03n': 'fas fa-cloud',
            '04d': 'fas fa-cloud',
            '04n': 'fas fa-cloud',
            '09d': 'fas fa-cloud-rain',
            '09n': 'fas fa-cloud-rain',
            '10d': 'fas fa-cloud-sun-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11d': 'fas fa-bolt',
            '11n': 'fas fa-bolt',
            '13d': 'fas fa-snowflake',
            '13n': 'fas fa-snowflake',
            '50d': 'fas fa-smog',
            '50n': 'fas fa-smog'
        };
        
        return iconMap[iconCode] || 'fas fa-thermometer-half';
    }

    updateWeatherTooltip(weatherData) {
        // Create tooltip content
        const tooltipContent = `
            <div class="weather-tooltip">
                <div><strong>${weatherData.location}</strong></div>
                <div>Temperature: ${weatherData.temperature}°C</div>
                <div>Condition: ${weatherData.condition}</div>
                <div>Wind: ${weatherData.windSpeed} mph</div>
                <div>Humidity: ${weatherData.humidity}%</div>
                <div>Risk Level: <span class="risk-${weatherData.riskLevel}">${weatherData.riskLevel}</span></div>
            </div>
        `;

        // Add tooltip to weather status items
        const weatherItems = document.querySelectorAll('.weather-status, .weather-condition');
        weatherItems.forEach(item => {
            item.title = tooltipContent;
        });
    }

    // Method to update connection status
    updateConnectionStatus(isConnected) {
        const connectionElement = document.querySelector('.status-left .status-item');
        if (connectionElement) {
            const icon = connectionElement.querySelector('i');
            const text = connectionElement.querySelector('span');
            
            if (icon) {
                icon.className = isConnected ? 'fas fa-wifi status-connected' : 'fas fa-wifi status-disconnected';
            }
            if (text) {
                text.textContent = isConnected ? 'Connected' : 'Disconnected';
            }
        }
    }

    // Method to update status message
    updateStatusMessage(message) {
        const statusElement = document.querySelector('.status-center .status-item span');
        if (statusElement) {
            statusElement.textContent = `Status: ${message}`;
        }
    }

    initializeWebSocketMonitoring() {
        // Check for WebSocket connection every 2 seconds
        setInterval(() => {
            this.checkWebSocketStatus();
        }, 2000);
    }

    checkWebSocketStatus() {
        // Check if websocketConnection exists in the global scope
        if (typeof window !== 'undefined' && window.websocketConnection) {
            const isConnected = window.websocketConnection.readyState === WebSocket.OPEN;
            this.updateConnectionStatus(isConnected);
        } else {
            // If no WebSocket connection object exists, show as disconnected
            this.updateConnectionStatus(false);
        }
    }

    initializeLocationSettings() {
        // Wait for location settings to be available
        const checkLocationSettings = () => {
            if (window.locationSettings) {
                const locationBtn = document.getElementById('openLocationSettings');
                if (locationBtn) {
                    locationBtn.addEventListener('click', () => {
                        window.locationSettings.show();
                    });
                }
            } else {
                setTimeout(checkLocationSettings, 100);
            }
        };
        checkLocationSettings();
    }
}

// Initialize status bar manager when DOM is ready
if (typeof window !== 'undefined') {
    function initializeStatusBar() {
        if (window.statusBarManager) {
            return; // Already initialized
        }
        
        window.statusBarManager = new StatusBarManager();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStatusBar);
    } else {
        initializeStatusBar();
    }
    
    setTimeout(initializeStatusBar, 50);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusBarManager;
} 