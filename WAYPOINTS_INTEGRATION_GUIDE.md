# Waypoints Integration Guide

## Overview

The Sky Loom application now includes a comprehensive waypoint management system that allows users to:

1. **Draw shapes** on the map using drawing tools
2. **Save shapes as named waypoints** with metadata
3. **Select waypoints** for mission planning
4. **Send waypoints to backend API** for drone mission execution
5. **Track missions** with waypoint progress

## Features

### 🎨 Drawing Tools Integration
- **Polygon Drawing**: Click to add points, right-click to finish
- **Square Drawing**: Click two points to define a perfect square
- **Circle Drawing**: Click center point, then click to set radius
- **Automatic Waypoint Creation**: Shapes are automatically converted to waypoints

### 💾 Waypoint Storage
- **Local Storage**: Waypoints saved in browser localStorage
- **File System**: Automatic fallback to file system in Electron
- **JSON Format**: Structured data with metadata
- **Backup System**: Automatic backups with version control

### 🔄 API Integration
- **Backend Communication**: Direct integration with `http://localhost:8000/waypoints`
- **Mission Format**: Converts waypoints to backend-compatible format
- **Error Handling**: Robust error handling and user feedback
- **Real-time Updates**: Live status updates and progress tracking

## API Endpoint

### POST /waypoints
**URL**: `http://localhost:8000/waypoints`
**Headers**: `Content-Type: application/json`

**Request Body**:
```json
{
  "waypoints name": "mission_name",
  "waypoints": [
    {
      "lat": 37.7749,
      "lon": -122.4194,
      "alt": 100
    },
    {
      "lat": 37.7849,
      "lon": -122.4094,
      "alt": 150
    }
  ]
}
```

**Response**:
```json
{
  "status": "saved",
  "mission": "mission_name"
}
```

## Usage Workflow

### 1. Drawing Shapes
1. Open the **AI Agent Panel** (right sidebar)
2. Use **Drawing Tools** on the map:
   - Select **Polygon** tool for freeform shapes
   - Select **Square** tool for rectangular areas
   - Select **Circle** tool for circular areas
3. **Draw on the map**:
   - **Polygon**: Click to add points, right-click to finish
   - **Square**: Click two corners
   - **Circle**: Click center, then click edge point

### 2. Saving Waypoints
1. **Complete your shape** using any drawing tool
2. **Name your waypoint** in the popup dialog
3. **Click Save** to store it permanently
4. Waypoint appears in the **Waypoints List**

### 3. Selecting Waypoints
1. **View waypoints** in the AI Agent panel
2. **Click the checkmark** to select waypoints for mission
3. **Selected waypoints** appear in Track Mission panel
4. **Multiple selection** supported

### 4. Sending to Backend
1. **Go to Track Mission panel** (left sidebar)
2. **Select waypoints** you want to include
3. **Click "Send to Backend"** button
4. **Enter mission name** when prompted
5. **Confirm** to send to API

## File Structure

```
renderer/components/rightSidebar/aiAgent/
├── aiAgent.js              # Main AI agent with waypoint management
├── waypointStorage.js      # Storage and persistence layer
├── drawingTools.js         # Drawing tools integration
├── aiAgent.html           # UI template with waypoint modal
├── aiAgent.css            # Styling for waypoint interface
└── test-waypoints.html    # Test page for functionality

renderer/components/leftSidebar/trackMission/
├── trackMission.js         # Mission tracking with waypoint integration
├── trackMission.html      # UI template with waypoints section
└── trackMission.css       # Styling for mission interface
```

## Data Structures

### Waypoint Object
```javascript
{
  id: "1705312200000",
  name: "landing_zone",
  type: "polygon", // "polygon", "square", "circle"
  coordinates: [
    {
      lat: 37.7749,
      lon: -122.4194,
      alt: 100
    }
  ],
  created: "2024-01-15T10:30:00.000Z",
  description: "polygon waypoint created via drawing tools",
  tags: ["polygon", "waypoint", "drawn"],
  metadata: {
    pointCount: 4,
    area: 0.00001,
    perimeter: 400.5
  }
}
```

### Backend Payload
```javascript
{
  "waypoints name": "test_mission",
  "waypoints": [
    {
      "lat": 37.7749,
      "lon": -122.4194,
      "alt": 100
    }
  ]
}
```

## Key Classes

### AIAgent
- **Main controller** for waypoint management
- **Handles drawing integration** with Cesium viewer
- **Manages waypoint selection** and storage
- **Provides API communication** methods

**Key Methods**:
- `saveCurrentWaypoint()` - Save drawn shape as waypoint
- `updateWaypointsList()` - Update UI with current waypoints
- `sendWaypointsToBackend()` - Send selected waypoints to API
- `toggleWaypointSelection()` - Select/deselect waypoints

### WaypointStorage
- **Handles persistence** (localStorage + file system)
- **Provides data conversion** between formats
- **Manages backups** and version control
- **Supports search** and filtering

**Key Methods**:
- `saveWaypoints()` - Save waypoints to storage
- `loadWaypoints()` - Load waypoints from storage
- `convertToBackendFormat()` - Convert to API format
- `searchWaypoints()` - Search waypoints by name/type

### TrackMission
- **Displays selected waypoints** in mission view
- **Handles mission creation** and tracking
- **Provides waypoint selection** interface
- **Manages API communication** for missions

**Key Methods**:
- `updateWaypointsList()` - Update waypoints display
- `sendWaypointsToBackend()` - Send waypoints to API
- `toggleWaypointSelection()` - Select waypoints for mission

## Testing

### Test Page
Open `renderer/components/rightSidebar/aiAgent/test-waypoints.html` to test:

1. **Component Initialization**
2. **Waypoint Creation**
3. **API Integration**
4. **Waypoint Selection**

### Manual Testing
1. **Start the application**
2. **Draw shapes** on the map
3. **Save waypoints** with names
4. **Select waypoints** for mission
5. **Send to backend** API
6. **Verify response** and mission creation

## Error Handling

### Common Issues
- **Backend not running**: Check if `http://localhost:8000` is accessible
- **CORS issues**: Ensure backend allows requests from frontend
- **Storage errors**: Fallback to localStorage if file system fails
- **Network errors**: Retry mechanism for API calls

### Error Messages
- `"No waypoints selected"` - Select waypoints before sending
- `"Backend not available"` - Check backend server status
- `"Invalid waypoint data"` - Check waypoint format
- `"Storage failed"` - Check file permissions

## Configuration

### Backend URL
The API endpoint is configured in:
- `aiAgent.js` - `sendWaypointsToBackend()` method
- `trackMission.js` - `sendWaypointsToBackend()` method

### Storage Settings
Storage configuration in `waypointStorage.js`:
- **File System**: `~/.skyloom/waypoints/`
- **LocalStorage**: `skyloom-waypoints` key
- **Backup Count**: 10 backup files maximum

## Future Enhancements

### Planned Features
- **Waypoint Categories** - Organize waypoints by type/purpose
- **Import/Export** - Share waypoints between users
- **Waypoint Templates** - Predefined waypoint patterns
- **Real-time Collaboration** - Share waypoints in real-time
- **Advanced Analytics** - Mission performance metrics

### API Extensions
- **Mission Status** - Real-time mission progress
- **Waypoint Validation** - Validate waypoints before sending
- **Batch Operations** - Send multiple missions
- **Mission Templates** - Reusable mission configurations

## Troubleshooting

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug-waypoints', 'true');
```

### Common Fixes
1. **Clear storage**: Use "Clear All Waypoints" button
2. **Restart application**: Reload the page
3. **Check backend**: Ensure API server is running
4. **Verify CORS**: Check browser console for CORS errors

### Support
For issues or questions:
1. Check browser console for error messages
2. Verify backend API is accessible
3. Test with the provided test page
4. Review this documentation for configuration details 