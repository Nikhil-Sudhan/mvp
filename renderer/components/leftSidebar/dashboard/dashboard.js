class Dashboard {
    constructor() {
        console.log('Dashboard initializing...');
        
        this.initializeEventListeners();
        this.resetMissionStatistics();
        this.resetWeatherData();
        this.initializeWeatherService();
        
        console.log('Dashboard initialized successfully');
    }

    initializeEventListeners() {
        // Refresh weather button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refresh-weather' || e.target.closest('#refresh-weather')) {
                this.refreshWeather();
            }
        });
    }



    refreshWeather() {
        const refreshBtn = document.getElementById('refresh-weather');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshBtn.disabled = true;
        }

        if (window.weatherService) {
            window.weatherService.fetchWeatherData().finally(() => {
                if (refreshBtn) {
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                    refreshBtn.disabled = false;
                }
            });
        }
    }

    resetMissionStatistics() {
        const elements = {
            'ongoing-missions': 0,
            'returning-missions': 0,
            'pending-missions': 0,
            'completed-missions': 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    resetWeatherData() {
        // Reset weather display to default empty state
        const tempElement = document.querySelector('.temperature');
        if (tempElement) {
            tempElement.textContent = '--°';
        }
        
        const descriptionElement = document.querySelector('.weather-description');
        if (descriptionElement) {
            descriptionElement.textContent = 'Loading weather...';
        }
        
        const locationElement = document.getElementById('current-location');
        if (locationElement) {
            locationElement.textContent = 'Detecting location...';
        }

        // Reset update time
        const updateTimeElement = document.getElementById('weather-update-time');
        if (updateTimeElement) {
            updateTimeElement.textContent = 'Last updated: --';
        }
    }

    initializeWeatherService() {
        // Wait for weather service to be available
        const checkWeatherService = () => {
            if (window.weatherService) {
                window.weatherService.onWeatherUpdate((weatherData) => {
                    this.updateWeatherData(weatherData);
                });
            } else {
                setTimeout(checkWeatherService, 100);
            }
        };
        checkWeatherService();
    }

    // Public methods for external API calls
    static getInstance() {
        return window.dashboardInstance;
    }

    updateMissionStatistics(stats) {
        // Method to update statistics when real data is available
        const elements = {
            'ongoing-missions': stats.ongoing || 0,
            'returning-missions': stats.returning || 0,
            'pending-missions': stats.pending || 0,
            'completed-missions': stats.completed || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateWeatherData(weatherData) {
        // Method to update weather when real data is available
        if (!weatherData) return;

        // Update temperature
        const tempElement = document.querySelector('.temperature');
        if (tempElement && weatherData.temperature) {
            tempElement.textContent = `${weatherData.temperature}°`;
        }
        
        // Update weather description
        const descriptionElement = document.querySelector('.weather-description');
        if (descriptionElement && weatherData.description) {
            descriptionElement.textContent = weatherData.description;
        }
        
        // Update weather icon
        const weatherIcon = document.querySelector('.weather-icon i');
        if (weatherIcon) {
            weatherIcon.className = this.getWeatherIconClass(weatherData.icon, weatherData.condition);
        }
        
        // Update condition text
        const conditionElement = document.querySelector('.condition-text');
        if (conditionElement && weatherData.condition) {
            conditionElement.textContent = `Condition: ${weatherData.condition}`;
        }
        
        // Update wind text
        const windElement = document.querySelector('.wind-text');
        if (windElement && weatherData.windSpeed) {
            windElement.textContent = `Wind: ${weatherData.windSpeed} mph`;
        }
        
        // Update humidity text
        const humidityElement = document.querySelector('.humidity-text');
        if (humidityElement && weatherData.humidity) {
            humidityElement.textContent = `Humidity: ${weatherData.humidity}%`;
        }

        // Update risk assessment
        const riskIndicator = document.querySelector('.risk-indicator');
        if (riskIndicator && weatherData.riskLevel) {
            riskIndicator.textContent = weatherData.riskLevel;
            riskIndicator.className = `risk-indicator ${weatherData.riskLevel.toLowerCase()}`;
        }



        // Update location display
        const locationElement = document.getElementById('current-location');
        if (locationElement && weatherData.location) {
            locationElement.textContent = weatherData.location;
        }

        // Update last updated time
        const updateTimeElement = document.getElementById('weather-update-time');
        if (updateTimeElement) {
            const now = new Date();
            updateTimeElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }

        // Status bar updates are now handled by StatusBarManager
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
        
        return iconMap[iconCode] || 'fas fa-cloud-sun';
    }


}

// Initialize dashboard when loaded
if (typeof window !== 'undefined') {
    // Function to initialize dashboard
    function initializeDashboard() {
        if (window.dashboardInstance) {
            return; // Already initialized
        }
        
        // Check if dashboard elements exist
        const dashboardPanel = document.querySelector('.dashboard-panel');
        if (dashboardPanel) {
            window.dashboardInstance = new Dashboard();
        } else {
            // If dashboard elements don't exist yet, try again in 100ms
            setTimeout(initializeDashboard, 100);
        }
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
        initializeDashboard();
    }
    
    // Also try to initialize when the script loads (for dynamic loading)
    setTimeout(initializeDashboard, 50);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
} 