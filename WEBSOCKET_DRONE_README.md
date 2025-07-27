# WebSocket Drone Simulation

This system simulates a drone using CesiumJS that receives real-time position updates via WebSocket.

## Features

✅ **Yellow Cuboid Drone**: Rendered as a 3D yellow box with "Drone 1" label  
✅ **WebSocket Connectivity**: Connects to `ws://localhost:8000/ws`  
✅ **Delta Position Updates**: Receives and applies position deltas in real-time  
✅ **Debug Display**: Shows before/delta/after position values  
✅ **Auto-Reconnection**: Automatically reconnects if connection is lost  
✅ **Command Palette Integration**: Control via built-in commands  

## Setup Instructions

### 1. Ensure Your Backend is Running

Make sure your drone backend WebSocket server is running on `ws://localhost:8000/ws` and sending drone data in the expected format.

### 2. Run the Sky Loom Application

```bash
# In your Sky Loom directory
npm start
```

The drone simulation will automatically initialize and connect to your WebSocket server when the application starts.

## How It Works

### Initial Position
The drone starts at:
- **Latitude**: 55.5
- **Longitude**: 22.2  
- **Altitude**: 0m

### Real Drone Data
The WebSocket server sends JSON messages in this format:
```json
{
  "timestamp": 1753653609.1333253,
  "lat": 0,
  "lon": 0,
  "alt": 0,
  "drone_status": {
    "mode": "UNKNOWN",
    "armed": false,
    "current_position": {
      "lat": -35.3632621,
      "lon": 149.1652374,
      "alt": 0
    }
  }
}
```

### Position Handling
The frontend uses the **absolute position** from `drone_status.current_position`:
```javascript
// Extract real position from drone data
currentPos = droneData.drone_status.current_position
// { lat: -35.3632621, lon: 149.1652374, alt: 0 }

// Delta values (for debugging)
deltaData = { lat: droneData.lat, lon: droneData.lon, alt: droneData.alt }

// Update drone to current position (not additive)
dronePosition = currentPos
```

## Controls

### Command Palette (Ctrl+Shift+P)
- `websocket drone` or `start drone` - Initialize WebSocket drone
- `disconnect drone` or `stop drone` - Disconnect WebSocket
- `reset drone` - Reset drone to initial position

### Debug Panel
- **Location**: Top-right corner of the screen
- **Toggle**: Click the `×` button to collapse/expand
- **Information**: Shows WebSocket status, position data, deltas, drone mode, armed status, and timestamp

### Visual Elements
- **Yellow Cuboid**: The drone (50×50×15 units)
- **White Label**: "Drone 1" text above the drone
- **Debug Panel**: Real-time position tracking

## Real-Time Features

The frontend provides:
- **Live Position Updates**: Processes absolute GPS coordinates from your drone
- **Status Monitoring**: Shows flight mode and armed/disarmed status
- **Timestamp Tracking**: Displays when each update was received
- **Automatic Reconnection**: Reconnects if WebSocket connection drops

## Troubleshooting

### WebSocket Connection Issues
1. Ensure the WebSocket server is running on port 8000
2. Check for firewall blocking localhost connections
3. Look for connection errors in the browser console

### Drone Not Visible
1. Check if Cesium viewer is properly initialized
2. Use the command palette: `reset drone`
3. Ensure the debug panel shows valid position data

### Performance Issues
1. The system automatically handles reconnection
2. Delta updates are processed in real-time
3. Check browser console for error messages

## Technical Details

### Dependencies
- **CesiumJS 1.111.0**: 3D globe rendering
- **WebSocket API**: Browser native WebSocket support
- **Your Backend**: Existing drone WebSocket server at `ws://localhost:8000/ws`

### File Structure
- `renderer/script.js`: Main drone simulation code with WebSocket handling
- `WEBSOCKET_DRONE_README.md`: This documentation

## Example Real Drone Messages

```json
// Armed drone with GPS position
{
  "timestamp": 1753653609.1333253,
  "lat": 0.0,
  "lon": 0.0,
  "alt": 0.0,
  "drone_status": {
    "mode": "GUIDED",
    "armed": true,
    "current_position": {
      "lat": -35.3632621,
      "lon": 149.1652374,
      "alt": 120.5
    }
  }
}

// Disarmed drone on ground
{
  "timestamp": 1753653610.2451234,
  "lat": 0.0,
  "lon": 0.0,
  "alt": 0.0,
  "drone_status": {
    "mode": "STABILIZE",
    "armed": false,
    "current_position": {
      "lat": -35.3632621,
      "lon": 149.1652374,
      "alt": 0.0
    }
  }
}
```

The system is now ready for real-time drone simulation! 🚁 