# Avionixis - Drone Control IDE

A Cursor IDE-inspired interface for drone control, built with Electron.

## Features

- **Cursor IDE-like Interface**: Familiar layout with expandable sidebars
- **AI Chat Assistant**: Left sidebar with intelligent drone control assistance
- **Drone Functions**: Right sidebar with quick access to drone controls
- **Command Palette**: Center search bar for quick command execution
- **Status Monitoring**: Bottom status bar showing real-time drone information
- **Modern UI**: Dark theme with smooth animations and transitions

## Installation

1. **Prerequisites**
   - Node.js (v16 or higher)
   - npm or yarn

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   npm start
   ```

## Usage

### Interface Layout

- **Top Bar**: 
  - Left: Avionixis application name
  - Center: Command palette (search bar)
  - Right: Window controls and settings

- **Left Sidebar**: 
  - AI Chat: Interact with AI assistant for drone control
  - File Explorer: Browse mission files and projects
  - Search: Search through files and content
  - Source Control: Git integration

- **Right Sidebar**:
  - Drone Functions: Quick access buttons for takeoff, land, hover, etc.
  - Flight Data: Real-time telemetry and status
  - Camera Feed: Live video stream (placeholder)
  - Settings: Configuration options

- **Center Area**: Welcome screen (ready for mission editor)
- **Bottom Status Bar**: Connection status, battery, GPS, and system info

### Key Features

#### Expandable Sidebars
- Click sidebar icons to expand/collapse panels
- Clicking the same icon again collapses the sidebar
- Multiple panels per sidebar with smooth transitions

#### AI Chat Assistant
- Natural language commands for drone control
- Type questions like "takeoff", "status", "battery level"
- Intelligent responses with context-aware suggestions

#### Command Palette
- Use the center search bar for quick commands
- Press `Ctrl+Shift+P` to focus the command palette
- Commands: `takeoff`, `land`, `hover`, `return`, `panel [name]`

#### Drone Functions
- One-click buttons for common drone operations
- Real-time status updates
- Integration with chat for command logging

### Keyboard Shortcuts

- `Ctrl+Shift+P`: Focus command palette
- `Escape`: Clear command palette
- `Enter`: Execute command or send chat message

## Development

### Project Structure
```
Avionixis/
├── main.js              # Electron main process
├── package.json         # Project configuration
├── renderer/
│   ├── index.html       # Main UI layout
│   ├── styles.css       # Cursor IDE-inspired styling
│   └── script.js        # UI interactions and functionality
└── README.md
```

### Building

```bash
# Development mode with logging
npm run dev

# Build for all platforms
npm run build

# Platform-specific builds
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Customization

- **Colors**: Modify CSS variables in `renderer/styles.css`
- **AI Responses**: Update `generateAIResponse()` in `renderer/script.js`
- **Drone Functions**: Add new functions to the function grid in HTML
- **Panels**: Add new sidebar panels by extending the HTML and JavaScript

## Integration

### Real Drone Integration
To connect with actual drones, replace the simulation functions in `script.js`:

```javascript
// Replace executeDroneFunction() with actual drone API calls
function executeDroneFunction(functionName) {
    // Your drone SDK integration here
    // Example: droneAPI.executeCommand(functionName);
}
```

### AI Integration
Replace the `generateAIResponse()` function with your preferred AI service:

```javascript
// Example with OpenAI API
async function generateAIResponse(userMessage) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage })
    });
    return response.json();
}
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please create an issue in the repository. 