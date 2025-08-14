// AIAgent API wrapper: centralizes all network calls used by AIAgent
// Depends on global DroneCommandAPI (renderer/components/rightSidebar/aiAgent/droneCommandAPI.js)

(function initAIAgentAPI() {
  function getClient() {
    // Create a new client each call to avoid stale configuration
    return new (window.DroneCommandAPI || DroneCommandAPI)();
  }

  async function sendCommand(command) {
    const client = getClient();
    return client.sendCommand(command);
  }

  async function sendCommandWithWaypoints(command, waypointData, droneName = null) {
    const client = getClient();
    return client.sendCommandWithWaypoints(command, waypointData, droneName);
  }

  async function sendWaypointsToBackend(missionName, waypointsArray, contextWaypointNames) {
    // Keep previous payload shape
    const payload = {
      "waypoints name": missionName,
      waypoints: waypointsArray,
      context_waypoints: contextWaypointNames || []
    };

    const endpoint = 'http://localhost:8000/waypoints';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  window.AIAgentAPI = { sendCommand, sendCommandWithWaypoints, sendWaypointsToBackend };
})();



