# Waypoint API Integration Guide

## Overview
The AI Agent now supports sending commands with waypoint data to a dedicated API endpoint. When waypoints are selected via the @ functionality, the system automatically sends the command along with the complete waypoint data to the backend.

## API Endpoint

### POST `/execute-command-with-waypoints`

**URL:** `http://localhost:8000/execute-command-with-waypoints`

**Method:** POST

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "command": "string",
  "waypoints": [
    {
      "id": "string",
      "name": "string", 
      "type": "string",
      "coordinates": [
        {
          "lat": "number",
          "lon": "number", 
          "alt": "number"
        }
      ],
      "description": "string",
      "tags": ["string"],
      "metadata": {
        "pointCount": "number",
        "area": "number",
        "perimeter": "number"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Command with waypoints received successfully",
  "data": {
    "command": "string",
    "waypointsCount": "number",
    "waypoints": [...],
    "timestamp": "string"
  }
}
```

## How It Works

### 1. Waypoint Selection
- Type `@` in the AI Agent text input
- Select waypoints from the dropdown
- Waypoints appear as tags in the "Add Context" area

### 2. Command Execution
- When you send a message with selected waypoints:
  - The system extracts waypoint data from the selected context waypoints
  - Sends the command + waypoint data to `/execute-command-with-waypoints`
  - If no waypoints are selected, uses the regular `/execute-command` endpoint

### 3. Data Flow
```
User Input → @ Selection → Context Waypoints → API Call → Backend Processing
```

## Example Usage

### Step 1: Select Waypoints
1. Open AI Agent panel
2. Type `@` in the text input
3. Select "Homee" from the dropdown
4. Waypoint appears as a tag in the context area

### Step 2: Send Command
```
Fly to the waypoint and take photos
```

### Step 3: API Call
The system automatically sends:
```json
{
  "command": "[SURVEILLANCE] Fly to the waypoint and take photos",
  "waypoints": [
    {
      "id": "1754256562837_c3f414d7-2e91-47d3-bdd1-ba798fa7adae",
      "name": "Homee",
      "type": "polygon",
      "coordinates": [
        {
          "lat": 9.684112890654557,
          "lon": 77.7754959941407,
          "alt": 100
        },
        {
          "lat": 9.683371068001714,
          "lon": 77.77794231407758,
          "alt": 100
        },
        {
          "lat": 9.67905189624969,
          "lon": 77.77504061262529,
          "alt": 100
        }
      ],
      "description": "polygon waypoint created via drawing tools",
      "tags": ["polygon", "waypoint", "drawn"],
      "metadata": {
        "pointCount": 3,
        "area": 0.00000635931189663097,
        "perimeter": 0.012841137835476187
      }
    }
  ]
}
```

## Testing

### Start Test Server
```bash
node test-server.js
```

### Test API Endpoint
```bash
curl -X POST http://localhost:8001/execute-command-with-waypoints \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Fly to waypoint",
    "waypoints": [{
      "id": "test1",
      "name": "Homee",
      "type": "polygon",
      "coordinates": [{"lat": 9.684, "lon": 77.775, "alt": 100}],
      "description": "Test waypoint",
      "tags": ["polygon", "waypoint"],
      "metadata": {"pointCount": 1, "area": 0.000001, "perimeter": 0.005}
    }]
  }'
```

### Browser Console Testing
```javascript
// Test waypoint API functionality
testWaypointAPI()

// Test waypoint suggestions
testWaypointSuggestions()

// Test enhanced @ functionality
testEnhancedAt()
```

## Implementation Details

### Frontend Changes
- **DroneCommandAPI**: Added `sendCommandWithWaypoints()` method
- **AIAgent**: Modified `sendMessage()` to use new endpoint when waypoints are selected
- **Waypoint Data Extraction**: `getWaypointDataForContext()` method extracts complete waypoint data

### Backend Changes
- **Test Server**: Handles `/execute-command-with-waypoints` endpoint
- **Data Logging**: Prints received command and waypoint data to console
- **Response Format**: Returns structured response with waypoint count and data

### Key Features
- ✅ Automatic waypoint data extraction
- ✅ Complete waypoint information (coordinates, metadata, etc.)
- ✅ Fallback to regular endpoint when no waypoints selected
- ✅ Real-time waypoint selection via @ functionality
- ✅ Context waypoint management with add/remove
- ✅ Comprehensive error handling and logging

## Integration Points

### With Drawing Tools
- Waypoints created via drawing tools are automatically available for @ selection
- Real-time updates when new waypoints are created

### With Map System
- Waypoint coordinates are in the same format as the map system
- Seamless integration with existing waypoint management

### With Backend Processing
- Complete waypoint data available for drone navigation
- Structured format for easy processing
- Extensible for additional waypoint properties 