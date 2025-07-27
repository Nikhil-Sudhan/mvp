class DroneCommandAPI {
    constructor() {
        this.baseURL = 'http://localhost:8001';
        this.endpoint = '/execute-command';
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DroneCommandAPI;
} 