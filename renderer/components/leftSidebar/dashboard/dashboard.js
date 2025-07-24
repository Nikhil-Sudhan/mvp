class Dashboard {
    constructor() {
        console.log('Dashboard initializing...');
        
        this.initializeEventListeners();
        this.resetMissionStatistics();
        this.resetWeatherData();
        
        console.log('Dashboard initialized successfully');
    }

    initializeEventListeners() {
        // Location change event listener
        document.addEventListener('change', (e) => {
            if (e.target.id === 'location-select') {
                console.log(`Location changed to: ${e.target.value}`);
                // In a real implementation, this would fetch weather data for the selected location
            }
        });
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
        
        // Reset location selector to default
        const locationSelect = document.getElementById('location-select');
        if (locationSelect) {
            locationSelect.selectedIndex = 0;
        }
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

        const tempElement = document.querySelector('.temperature');
        if (tempElement && weatherData.temperature) {
            tempElement.textContent = `${weatherData.temperature}°`;
        }
        
        // Update other weather elements as needed
        const conditionElements = document.querySelectorAll('.condition-item span');
        if (conditionElements.length >= 2) {
            if (weatherData.condition) {
                conditionElements[0].textContent = `Condition: ${weatherData.condition}`;
            }
            if (weatherData.windSpeed) {
                conditionElements[1].textContent = `Wind speed: ${weatherData.windSpeed} mph`;
            }
        }

        // Update risk assessment
        const riskIndicator = document.querySelector('.risk-indicator');
        if (riskIndicator && weatherData.riskLevel) {
            riskIndicator.textContent = weatherData.riskLevel;
            riskIndicator.className = `risk-indicator ${weatherData.riskLevel.toLowerCase()}`;
        }
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