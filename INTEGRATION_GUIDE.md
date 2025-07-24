# Sky Loom Integration Guide

## 🎉 New Modular Sidebar System

Your Sky Loom application has been successfully upgraded with a modular component system! Here's what changed and how to work with it.

## ✅ What Was Replaced

### **Before (Old System):**
- Hardcoded sidebar HTML in `index.html`
- Monolithic `script.js` with all functionality
- Static sidebar panels

### **After (New System):**
- **Dynamic sidebars** created by `sidebarManager.js`
- **Modular components** in separate folders
- **22 individual files** for better organization
- **Async component loading** from actual files

## 🔧 How It Works Now

### **1. Sidebar Creation**
The `sidebarManager.js` automatically creates:
- **Left Sidebar**: Logo, Dashboard, Drone Config, Track Mission, Help, Profile, Settings
- **Right Sidebar**: AI Agent, Telemetry

### **2. Component Loading**
When you click a sidebar icon:
1. **HTML** loads from `components/[sidebar]/[component]/[component].html`
2. **CSS** loads from `components/[sidebar]/[component]/[component].css`
3. **JavaScript** loads from `components/[sidebar]/[component]/[component].js`

### **3. Page Flow**
```
Application Start
    ↓
sidebarManager.js initializes
    ↓
Creates sidebar structure
    ↓
Loads Dashboard (left) & Telemetry (right) by default
    ↓
User clicks sidebar icons → Components load dynamically
```

## 🎮 How to Use

### **Command Palette (Ctrl+Shift+P)**
Type commands to switch panels:
- `dashboard` → Opens Dashboard
- `mission` → Opens Track Mission
- `help` → Opens Help System
- `ai` → Opens AI Agent
- `telemetry` → Opens Telemetry
- `takeoff`, `land`, `hover`, `return` → Execute drone functions

### **Welcome Screen Buttons**
- **New Mission** → Opens Track Mission panel
- **Open Project** → Opens Profile panel

### **Sidebar Icons**
Click any icon to toggle that panel open/closed

## 🔌 API Integration

### **Global API (`window.skyLoomAPI`)**
```javascript
// Execute commands
skyLoomAPI.executeCommand('dashboard');

// Control drone functions
skyLoomAPI.executeDroneFunction('takeoff');

// Update telemetry data
skyLoomAPI.updateTelemetryData({
    altitude: '10.5m',
    speed: '3.2 m/s',
    battery: '85%'
});

// Show notifications
skyLoomAPI.showNotification('Mission completed!', 'success');

// Update status bar
skyLoomAPI.updateStatusBar('center', 'Status: Flying');
```

### **Component Registration**
Components can register themselves:
```javascript
// In your component JS file
class MyComponent {
    constructor() {
        // Register with the global API
        window.skyLoomAPI.registerComponent('myComponent', this);
    }
}
```

### **Development Helpers**
In development mode, use the console:
```javascript
// Open specific panels
dev.openPanel('left', 'dashboard');
dev.openPanel('right', 'telemetry');

// Execute commands
dev.executeCommand('takeoff');

// Simulate telemetry data
dev.simulateData({ altitude: '15.0m' });
```

## 🎨 Customization

### **Adding New Components**
1. Create folder: `renderer/components/leftSidebar/myComponent/`
2. Add files: `myComponent.html`, `myComponent.css`, `myComponent.js`
3. Update `sidebarManager.js` to include your component
4. Add icon to sidebar creation

### **Modifying Existing Components**
- Edit the HTML, CSS, or JS files directly
- Changes load automatically when the component is opened
- Each file is under 500-700 lines for easy understanding

### **Styling**
- Use CSS variables from `common/sidebar.css`
- Dark/light theme support built-in
- Consistent design patterns across components

## 🚀 Features Added

### **✨ New Notification System**
- Toast notifications for user feedback
- Success, warning, error, and info types
- Automatic dismissal after 3 seconds

### **🎯 Enhanced Command System**
- Natural language commands
- Panel switching via commands
- Drone function execution
- Smart command recognition

### **📱 Responsive Layout**
- Mobile-friendly sidebar behavior
- Smooth animations and transitions
- Adaptive spacing and sizing

### **🔄 Real-time Updates**
- Status bar updates every 5 seconds
- Battery simulation
- Time display when not showing status

## 🛠️ Troubleshooting

### **Component Not Loading?**
1. Check console for errors
2. Verify file paths in `renderer/components/`
3. Ensure proper HTML/CSS/JS structure

### **Sidebar Not Responding?**
1. Check if `sidebarManager.js` loaded properly
2. Verify `window.sidebarManager` exists in console
3. Check for JavaScript errors

### **Styling Issues?**
1. Ensure `components/common/sidebar.css` is loaded
2. Check CSS variable definitions
3. Verify component-specific CSS files

## 📋 File Structure Summary

```
renderer/
├── index.html (✅ Updated - minimal sidebar HTML)
├── script.js (✅ Updated - refined functionality)
├── styles.css (✅ Updated - added notifications)
└── components/
    ├── leftSidebar/
    │   ├── logo/ (HTML, CSS)
    │   ├── dashboard/ (HTML, CSS, JS)
    │   ├── droneConfiguration/ (HTML, CSS, JS)
    │   ├── trackMission/ (HTML, CSS)
    │   ├── help/ (HTML, CSS)
    │   ├── profile/ (HTML, CSS)
    │   └── settings/ (HTML, CSS)
    ├── rightSidebar/
    │   ├── aiAgent/ (HTML, CSS)
    │   └── telemetry/ (HTML, CSS)
    └── common/
        ├── sidebar.css (✅ New - common styles)
        └── sidebarManager.js (✅ New - main controller)
```

## 🎯 Next Steps

1. **Test the application**: All components should load properly
2. **Customize components**: Edit individual files as needed
3. **Add functionality**: Implement your specific drone control logic
4. **Extend system**: Add new components following the established pattern

The modular system makes it much easier to:
- 🎯 **Understand** individual components
- 🔧 **Maintain** specific features
- 🚀 **Scale** with new functionality
- 🐛 **Debug** isolated issues

Your Sky Loom application is now more organized, maintainable, and ready for future enhancements! 🚁✨ 