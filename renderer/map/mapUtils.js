// Map Utility Functions

// Drone-specific map functions
function addDroneMarker(id, longitude, latitude, altitude = 100, label = 'Drone') {
    if (!window.viewer) return null;

    return window.viewer.entities.add({
        id: id,
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
        billboard: {
            image: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#007acc">
                    <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/>
                    <circle cx="8" cy="8" r="2" fill="#ffffff"/>
                    <circle cx="16" cy="8" r="2" fill="#ffffff"/>
                    <circle cx="8" cy="16" r="2" fill="#ffffff"/>
                    <circle cx="16" cy="16" r="2" fill="#ffffff"/>
                </svg>
            `),
            scale: 1.5,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM
        },
        label: {
            text: label,
            font: '12pt sans-serif',
            pixelOffset: new Cesium.Cartesian2(0, -50),
            fillColor: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE
        }
    });
}

function updateDronePosition(droneId, longitude, latitude, altitude = 100) {
    if (!window.viewer) return;

    const drone = window.viewer.entities.getById(droneId);
    if (drone) {
        drone.position = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
    }
}

function addFlightPath(positions, color = Cesium.Color.CYAN) {
    if (!window.viewer || !positions.length) return null;

    return window.viewer.entities.add({
        polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
            width: 3,
            clampToGround: false,
            material: color
        }
    });
}

// Export functions for global access
window.MapUtilsAPI = {
    addDroneMarker,
    updateDronePosition,
    addFlightPath
}; 