class WeatherService {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1';
        this.currentLocation = null;
        this.weatherData = null;
        this.updateCallbacks = [];
        this.locationPermissionGranted = false;
        
        this.init();
    }

    async init() {
        try {
            await this.getCurrentLocation();
            if (this.currentLocation) {
                await this.fetchWeatherData();
                this.startPeriodicUpdates();
            }
        } catch (error) {
            console.error('Weather service initialization failed:', error);
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation not supported, using IP-based location');
                this.getLocationFromIP().then(resolve).catch(() => {
                    this.useDefaultLocation();
                    resolve();
                });
                return;
            }

            // Check if we're in Electron and handle permissions
            if (window.require && window.require('electron')) {
                this.handleElectronGeolocation(resolve, reject);
            } else {
                this.handleBrowserGeolocation(resolve, reject);
            }
        });
    }

    handleElectronGeolocation(resolve, reject) {
        const { ipcRenderer } = window.require('electron');
        
        // Request geolocation permission through Electron
        ipcRenderer.invoke('request-geolocation-permission').then((permission) => {
            if (permission === 'granted') {
                this.locationPermissionGranted = true;
                this.handleBrowserGeolocation(resolve, reject);
            } else {
                console.warn('Geolocation permission denied, using IP-based location');
                this.getLocationFromIP().then(resolve).catch(() => {
                    this.useDefaultLocation();
                    resolve();
                });
            }
        }).catch(() => {
            // Fallback to IP-based location
            this.getLocationFromIP().then(resolve).catch(() => {
                this.useDefaultLocation();
                resolve();
            });
        });
    }

    handleBrowserGeolocation(resolve, reject) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                // Location obtained
                resolve();
            },
            (error) => {
                console.warn('Location access failed:', error);
                // Try IP-based location as fallback
                this.getLocationFromIP().then(resolve).catch(() => {
                    this.useDefaultLocation();
                    resolve();
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 300000 // 5 minutes
            }
        );
    }

    async getLocationFromIP() {
        try {
            // Use a free IP geolocation service
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const data = await response.json();
                this.currentLocation = {
                    lat: parseFloat(data.latitude),
                    lon: parseFloat(data.longitude)
                };
                // Location from IP
                return Promise.resolve();
            }
        } catch (error) {
            console.warn('IP-based location failed:', error);
        }
        return Promise.reject('IP location failed');
    }

    useDefaultLocation() {
        // Use a more generic default location (New York)
        this.currentLocation = { lat: 40.7128, lon: -74.0060 };
        // Using default location
    }

    async fetchWeatherData() {
        if (!this.currentLocation) {
            console.warn('No location available for weather fetch');
            return;
        }

        try {
            const url = `${this.baseUrl}/forecast?latitude=${this.currentLocation.lat}&longitude=${this.currentLocation.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();
            this.weatherData = await this.processWeatherData(data);
            this.notifyUpdateCallbacks();
            
            // Weather data updated
        } catch (error) {
            console.error('Failed to fetch weather data:', error);
            // Use mock data as fallback
            this.weatherData = this.getMockWeatherData();
            this.notifyUpdateCallbacks();
        }
    }

    async processWeatherData(data) {
        const current = data.current;
        const weatherCode = current.weather_code;
        
        // Get location name
        const locationName = await this.getLocationName(this.currentLocation.lat, this.currentLocation.lon);
        
        return {
            temperature: Math.round(current.temperature_2m),
            condition: this.getWeatherCondition(weatherCode),
            description: this.getWeatherDescription(weatherCode),
            windSpeed: Math.round(current.wind_speed_10m * 2.237), // Convert km/h to mph
            humidity: current.relative_humidity_2m,
            pressure: 1013, // Open-Meteo doesn't provide pressure in free tier
            location: locationName,
            icon: this.getWeatherIcon(weatherCode),
            riskLevel: this.calculateRiskLevel(current.temperature_2m, current.wind_speed_10m, current.relative_humidity_2m)
        };
    }

    getWeatherCondition(code) {
        const conditions = {
            0: 'Clear', 1: 'Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Foggy',
            51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
            61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
            71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
            77: 'Snow Grains',
            80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
            85: 'Light Snow', 86: 'Heavy Snow',
            95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Heavy Thunderstorm'
        };
        return conditions[code] || 'Unknown';
    }

    getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
            77: 'Snow grains',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
            85: 'Slight snow showers', 86: 'Heavy snow showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
        };
        return descriptions[code] || 'Unknown weather';
    }

    getWeatherIcon(code) {
        const icons = {
            0: '01d', 1: '01d', 2: '02d', 3: '03d',
            45: '50d', 48: '50d',
            51: '09d', 53: '09d', 55: '09d',
            61: '10d', 63: '10d', 65: '10d',
            71: '13d', 73: '13d', 75: '13d',
            77: '13d',
            80: '09d', 81: '09d', 82: '09d',
            85: '13d', 86: '13d',
            95: '11d', 96: '11d', 99: '11d'
        };
        return icons[code] || '01d';
    }

    async getLocationName(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
            if (response.ok) {
                const data = await response.json();
                return data.display_name.split(',')[0]; // Get city name
            }
        } catch (error) {
            console.warn('Failed to get location name:', error);
        }
        return 'Current Location';
    }

    calculateRiskLevel(temp, windSpeed, humidity) {
        let riskScore = 0;
        
        // Temperature risk (ideal: 15-25°C)
        if (temp < 0 || temp > 35) riskScore += 3;
        else if (temp < 10 || temp > 30) riskScore += 2;
        else if (temp < 15 || temp > 25) riskScore += 1;
        
        // Wind risk (ideal: < 10 m/s)
        if (windSpeed > 15) riskScore += 3;
        else if (windSpeed > 10) riskScore += 2;
        else if (windSpeed > 5) riskScore += 1;
        
        // Humidity risk (ideal: 30-70%)
        if (humidity > 80 || humidity < 20) riskScore += 2;
        else if (humidity > 70 || humidity < 30) riskScore += 1;
        
        if (riskScore >= 6) return 'high';
        if (riskScore >= 3) return 'medium';
        return 'low';
    }

    getMockWeatherData() {
        return {
            temperature: 25,
            condition: 'Clear',
            description: 'clear sky',
            windSpeed: 8,
            humidity: 65,
            pressure: 1013,
            location: 'Current Location',
            icon: '01d',
            riskLevel: 'low'
        };
    }

    startPeriodicUpdates() {
        // Update weather every 10 minutes
        setInterval(() => {
            this.fetchWeatherData();
        }, 600000);
    }

    onWeatherUpdate(callback) {
        this.updateCallbacks.push(callback);
        // Immediately call with current data if available
        if (this.weatherData) {
            callback(this.weatherData);
        }
    }

    notifyUpdateCallbacks() {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(this.weatherData);
            } catch (error) {
                console.error('Weather update callback error:', error);
            }
        });
    }

    getCurrentWeather() {
        return this.weatherData;
    }

    // Method to manually update location (for testing or user preference)
    async updateLocation(lat, lon) {
        this.currentLocation = { lat, lon };
        await this.fetchWeatherData();
    }

    // Method to get location by city name
    async getLocationByCity(cityName) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`);
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    const location = data[0];
                    this.currentLocation = {
                        lat: parseFloat(location.lat),
                        lon: parseFloat(location.lon)
                    };
                    await this.fetchWeatherData();
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to get location by city:', error);
        }
        return false;
    }

    // Method to refresh location and weather
    async refreshLocation() {
        await this.getCurrentLocation();
        if (this.currentLocation) {
            await this.fetchWeatherData();
        }
    }
}

// Initialize weather service
if (typeof window !== 'undefined') {
    window.weatherService = new WeatherService();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherService;
} 