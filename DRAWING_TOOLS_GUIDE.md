# Enhanced Drawing Tools Guide

## 🎨 Overview

The Sky Loom application now includes a comprehensive drawing tools system that allows you to create, save, and manage various geometric shapes as waypoints. These waypoints can be searched and referenced using the AI agent's @ functionality.

## ✨ Features

### 🔧 Drawing Tools
- **Polygon**: Click to add points, right-click to finish (minimum 3 points)
- **Square**: Click two points to define a perfect square
- **Circle**: Click center point, then click to set radius
- **Erase**: Click on shapes to delete them

### 💾 Storage System
- **JSON File Storage**: Waypoints are saved as JSON files in `~/.skyloom/waypoints/`
- **Automatic Backups**: Up to 10 backup files are maintained automatically
- **Individual Files**: Each waypoint gets its own searchable JSON file
- **Fallback Support**: Automatic fallback to localStorage if file system fails

### 🔍 AI Integration
- **@ Search**: Type `@waypoint-name` in the AI chat to reference waypoints
- **Autocomplete**: Dynamic suggestions as you type
- **Context Awareness**: AI understands waypoint types and provides relevant responses

## 🚀 How to Use

### 1. Drawing Shapes

1. **Open the AI Agent Panel** (right sidebar)
2. **Find the Drawing Tools Toolbar** at the top of the panel
3. **Select a Tool**:
   - Click **Polygon** for freeform shapes
   - Click **Square** for perfect rectangles
   - Click **Circle** for circular areas
   - Click **Erase** to delete existing shapes

### 2. Drawing Process

#### Polygon Drawing:
- Click on the map to add points
- Right-click to finish (minimum 3 points required)
- Press `Escape` to cancel anytime

#### Square Drawing:
- Click first corner
- Click second corner to define size
- Square is automatically created

#### Circle Drawing:
- Click center point
- Click anywhere to set radius
- Circle is automatically created

#### Erasing:
- Select the erase tool
- Click on any shape to delete it
- Works with both saved and unsaved shapes

### 3. Saving Waypoints

1. **Complete your shape** using any drawing tool
2. **Name your waypoint** in the popup dialog
3. **Click Save** to store it permanently
4. The waypoint is now searchable with `@` in the AI chat

### 4. Using Waypoints in AI Chat

- Type `@` followed by the waypoint name
- Get autocomplete suggestions
- Reference waypoints in conversations
- Ask questions about specific areas

## 📁 File Structure

```
~/.skyloom/
├── waypoints/
│   ├── waypoints.json           # Master waypoints file
│   ├── individual/              # Individual waypoint files
│   │   ├── landing_zone.json
│   │   ├── survey_area.json
│   │   └── home_base.json
│   └── backups/                 # Automatic backups
│       ├── waypoints-backup-2024-01-15T10-30-00.json
│       └── ...
```

## 🔧 Technical Details

### Waypoint Data Structure
```json
{
  "id": "1705312200000",
  "name": "landing-zone",
  "type": "square",
  "positions": [
    {
      "longitude": -122.4194,
      "latitude": 37.7749,
      "height": 0
    }
  ],
  "created": "2024-01-15T10:30:00.000Z",
  "entityId": "cesium-entity-id",
  "description": "square waypoint created via drawing tools",
  "tags": ["square", "waypoint", "drawn"],
  "metadata": {
    "pointCount": 4,
    "area": 0.00001,
    "perimeter": 400.5
  }
}
```

### Shape Types
- **polygon**: Freeform multi-point shape
- **square**: Perfect rectangle with equal sides
- **circle**: Circular area with 64-point approximation

## 🎮 Keyboard Shortcuts

- `Escape`: Cancel current drawing operation
- `Enter`: Finish polygon drawing (polygons only)
- `@`: Trigger waypoint autocomplete in AI chat

## 💡 Tips & Tricks

1. **Precise Drawing**: Zoom in for more accurate shape placement
2. **Shape Preview**: See real-time preview while drawing squares and circles
3. **Status Updates**: Watch the status bar for drawing instructions
4. **Quick Access**: Use the toolbar toggle to save space
5. **Backup Safety**: Your waypoints are automatically backed up
6. **Search Power**: Use descriptive names for better @ search results

## 🔍 AI Integration Examples

**Basic Reference:**
```
User: Fly to @landing-zone
AI: I see you're referencing @landing-zone. I'll help coordinate the flight to that square waypoint.
```

**Complex Queries:**
```
User: What's the distance between @home-base and @survey-area?
AI: I can help calculate the distance between those two waypoints and plan an optimal flight path.
```

## 🛠️ Troubleshooting

### Issue: Drawing tools not appearing
**Solution**: Make sure Cesium viewer is loaded. Wait a few seconds after app start.

### Issue: Waypoints not saving
**Check**: File system permissions for `~/.skyloom/` directory
**Fallback**: System automatically uses localStorage if file system fails

### Issue: @ search not working
**Solution**: Ensure waypoints are properly saved and AI agent is initialized

### Issue: Shapes not visible
**Check**: Cesium viewer zoom level and camera position

## 🔄 Data Migration

The system automatically handles migration from localStorage to JSON files:
1. Existing localStorage waypoints are preserved
2. New waypoints use JSON file storage
3. Seamless fallback if file system unavailable

## 📊 Statistics & Management

The system provides:
- Total waypoint count
- Shape type distribution
- Creation/modification dates
- Export/import capabilities (programmatic)

## 🚀 Future Enhancements

Potential improvements:
- Additional shape types (ellipse, bezier curves)
- Waypoint grouping and categorization
- Advanced search filters
- Collaborative waypoint sharing
- Waypoint templates and presets

---

**Enjoy creating and managing your flight waypoints with the enhanced drawing tools! ✈️** 