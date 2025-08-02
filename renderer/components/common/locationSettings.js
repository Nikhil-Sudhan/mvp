class LocationSettings {
    constructor() {
        this.isVisible = false;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modal = document.createElement('div');
        modal.id = 'location-settings-modal';
        modal.className = 'location-settings-modal';
        modal.innerHTML = `
            <div class="location-settings-content">
                <div class="location-settings-header">
                    <h3>Location Settings</h3>
                    <button class="close-btn" id="close-location-settings">&times;</button>
                </div>
                <div class="location-settings-body">
                    <div class="location-method">
                        <h4>Current Location</h4>
                        <p>Use your device's GPS location</p>
                        <button id="use-current-location" class="btn btn-primary">Use Current Location</button>
                    </div>
                    <div class="location-divider">OR</div>
                    <div class="location-method">
                        <h4>Search by City</h4>
                        <div class="search-container">
                            <input type="text" id="city-search" placeholder="Enter city name..." class="city-input">
                            <button id="search-city" class="btn btn-secondary">Search</button>
                        </div>
                        <div id="search-results" class="search-results"></div>
                    </div>
                    <div class="location-method">
                        <h4>Manual Coordinates</h4>
                        <div class="coordinate-inputs">
                            <input type="number" id="latitude" placeholder="Latitude" step="any" class="coord-input">
                            <input type="number" id="longitude" placeholder="Longitude" step="any" class="coord-input">
                        </div>
                        <button id="set-coordinates" class="btn btn-secondary">Set Coordinates</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    bindEvents() {
        // Close modal
        document.getElementById('close-location-settings').addEventListener('click', () => {
            this.hide();
        });

        // Use current location
        document.getElementById('use-current-location').addEventListener('click', async () => {
            if (window.weatherService) {
                await window.weatherService.refreshLocation();
                this.hide();
            }
        });

        // Search by city
        document.getElementById('search-city').addEventListener('click', async () => {
            const cityInput = document.getElementById('city-search');
            const cityName = cityInput.value.trim();
            if (cityName && window.weatherService) {
                const success = await window.weatherService.getLocationByCity(cityName);
                if (success) {
                    this.hide();
                } else {
                    this.showError('City not found. Please try a different city name.');
                }
            }
        });

        // Set manual coordinates
        document.getElementById('set-coordinates').addEventListener('click', async () => {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lon = parseFloat(document.getElementById('longitude').value);
            
            if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                if (window.weatherService) {
                    await window.weatherService.updateLocation(lat, lon);
                    this.hide();
                }
            } else {
                this.showError('Please enter valid coordinates (Latitude: -90 to 90, Longitude: -180 to 180)');
            }
        });

        // Close on outside click
        document.getElementById('location-settings-modal').addEventListener('click', (e) => {
            if (e.target.id === 'location-settings-modal') {
                this.hide();
            }
        });
    }

    show() {
        document.getElementById('location-settings-modal').style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        document.getElementById('location-settings-modal').style.display = 'none';
        this.isVisible = false;
    }

    showError(message) {
        const resultsDiv = document.getElementById('search-results');
        resultsDiv.innerHTML = `<div class="error-message">${message}</div>`;
        resultsDiv.style.display = 'block';
    }
}

// Initialize location settings
if (typeof window !== 'undefined') {
    window.locationSettings = new LocationSettings();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationSettings;
} 