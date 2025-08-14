class DroneCommandAPI {
    constructor() {
        this.baseURL = 'http://localhost:8000';
        this.endpoint = '/execute-command';
        this.waypointEndpoint = '/execute-command-with-waypoints';
    }

    /**
     * Send a command to the API
     * @param {string} command - The command to execute
     * @returns {Promise<Object>} - API response
     */
    async sendCommand(command) {
        try {
            const response = await fetch(`${this.baseURL}${this.endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: command
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data: data
            };

        } catch (error) {
            console.error('Error sending command:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send a command with waypoint data to the API
     * @param {string} command - The command to execute
     * @param {Array} waypoints - Array of waypoint objects
     * @param {string} droneName - Optional drone name for context
     * @returns {Promise<Object>} - API response
     */
    async sendCommandWithWaypoints(command, waypoints, droneName = null) {
        try {
            console.log('📡 Sending command with waypoints:', {
                command: command,
                waypoints: waypoints,
                droneName: droneName,
                url: `${this.baseURL}${this.waypointEndpoint}`
            });

            const requestBody = {
                command: command,
                waypoints: waypoints
            };

            // Add drone_name if provided
            if (droneName) {
                requestBody.drone_name = droneName;
            }

            console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

            const response = await fetch(`${this.baseURL}${this.waypointEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ HTTP error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Command with waypoints response:', data);
            
            return {
                success: true,
                data: data
            };

        } catch (error) {
            console.error('❌ Error sending command with waypoints:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack,
                url: `${this.baseURL}${this.waypointEndpoint}`
            });
            return {
                success: false,
                error: error.message
            };
        }
    }


}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DroneCommandAPI;
} 