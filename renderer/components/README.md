# Sky Loom Modular Components

This folder contains the modular component structure for the Sky Loom drone control application. Each component is organized in its own folder with separate HTML, CSS, and JavaScript files for better maintainability and understanding.

## 📁 Folder Structure

```
renderer/components/
├── leftSidebar/                    # Left sidebar components
│   ├── logo/                       # Application logo
│   │   ├── logo.html
│   │   └── logo.css
│   ├── dashboard/                  # Main dashboard with quick stats
│   │   ├── dashboard.html
│   │   ├── dashboard.css
│   │   └── dashboard.js
│   ├── droneConfiguration/         # Drone settings and config
│   │   ├── droneConfiguration.html
│   │   ├── droneConfiguration.css
│   │   └── droneConfiguration.js
│   ├── trackMission/              # Mission planning and tracking
│   │   ├── trackMission.html
│   │   └── trackMission.css
│   ├── help/                      # Help and support system
│   │   ├── help.html
│   │   └── help.css
│   ├── profile/                   # User profile management
│   │   ├── profile.html
│   │   └── profile.css
│   └── settings/                  # Application settings
│       ├── settings.html
│       └── settings.css
├── rightSidebar/                  # Right sidebar components
│   ├── aiAgent/                   # AI chat assistant
│   │   ├── aiAgent.html
│   │   └── aiAgent.css
│   └── telemetry/                 # Real-time flight data
│       ├── telemetry.html
│       └── telemetry.css
└── common/                        # Shared components and utilities
    ├── sidebar.css                # Common sidebar styles and CSS variables
    └── sidebarManager.js          # Main coordination logic
```

## 🎯 Component Features

### Left Sidebar Components

- **🏠 Logo**: Application branding with Sky Loom logo and version
- **📊 Dashboard**: Flight status, battery, GPS, temperature, and quick actions
- **⚙️ Drone Configuration**: Connection settings, flight parameters, safety settings
- **🗺️ Track Mission**: Mission planning, waypoint management, mission control
- **❓ Help**: Searchable help system with categories and documentation links
- **👤 Profile**: User information, flight statistics, certifications, recent activity
- **🔧 Settings**: Appearance, audio, controls, data storage, network, privacy settings

### Right Sidebar Components

- **🤖 AI Agent**: Intelligent chat assistant for drone operations with quick actions
- **📈 Telemetry**: Real-time flight data, position info, system status, charts, alerts

## 🚀 How to Use

### 1. Include Common Styles
```html
<link rel="stylesheet" href="components/common/sidebar.css">
```

### 2. Initialize the Sidebar Manager
```html
<script src="components/common/sidebarManager.js"></script>
```

### 3. Component Integration
Each component can be loaded individually:

```html
<!-- Dashboard Component -->
<link rel="stylesheet" href="components/leftSidebar/dashboard/dashboard.css">
<script src="components/leftSidebar/dashboard/dashboard.js"></script>
```

### 4. Icon System
All components use Font Awesome icons:
- Dashboard: `fas fa-tachometer-alt`
- Drone Config: `fas fa-cogs`
- Track Mission: `fas fa-route`
- Help: `fas fa-question-circle`
- Profile: `fas fa-user`
- Settings: `fas fa-cog`
- AI Agent: `fas fa-robot`
- Telemetry: `fas fa-chart-line`

## 🎨 Theming

The application supports both dark and light themes through CSS variables defined in `common/sidebar.css`:

```css
:root {
    --accent-color: #4a90e2;
    --text-primary: #cccccc;
    --bg-primary: #1e1e1e;
    /* ... more variables */
}
```

## 📏 Code Organization Guidelines

- **Each file should be 500-700 lines maximum** for easy understanding
- **One component per folder** with related HTML, CSS, and JS files
- **Consistent naming convention**: componentName.html, componentName.css, componentName.js
- **Modular CSS** with component-specific styles
- **Reusable JavaScript classes** with proper initialization

## 🔧 Development Tips

1. **Component Independence**: Each component should be self-contained
2. **Event Handling**: Use event delegation for better performance
3. **State Management**: Components communicate through the main sidebar manager
4. **Responsive Design**: All components are mobile-friendly
5. **Accessibility**: Proper ARIA labels and keyboard navigation support

## 🎮 Component APIs

### Dashboard
```javascript
// Update flight status
window.dashboardInstance.updateFlightStatus('Taking Off');

// Update battery level
window.dashboardInstance.updateBatteryLevel(85);
```

### Drone Configuration
```javascript
// Get current configuration
const config = DroneConfiguration.getCurrentConfig();

// Validate configuration
const errors = instance.validateConfiguration(config);
```

### Sidebar Manager
```javascript
// Toggle specific panels
window.sidebarManager.toggleLeftSidebar('dashboard');
window.sidebarManager.toggleRightSidebar('telemetry');
```

## 🚀 Getting Started

1. Copy the `components` folder to your `renderer` directory
2. Include the common styles and sidebar manager in your main HTML
3. The sidebar manager will automatically create the sidebar structure
4. Components are loaded dynamically when panels are opened

This modular structure makes it easy to:
- Understand individual components
- Maintain and update specific features
- Add new components without affecting existing ones
- Debug issues in isolated components
- Scale the application with additional features

Happy coding! 🚁✨ 