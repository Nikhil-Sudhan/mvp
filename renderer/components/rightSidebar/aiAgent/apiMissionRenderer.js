class ApiMissionRenderer {
    constructor() {
        this.viewer = null;
        this.renderedEntityIds = new Set();
    }

    getViewer() {
        // Resolve Cesium viewer from globals each time to avoid stale refs
        const viewer = window.cesiumViewer || window.viewer || null;
        this.viewer = viewer;
        return viewer;
    }

    clearPrevious() {
        const viewer = this.getViewer();
        if (!viewer) return;
        for (const id of this.renderedEntityIds) {
            try {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            } catch (_) {}
        }
        this.renderedEntityIds.clear();
    }

    renderFromApiResponse(apiData, options = {}) {
        const viewer = this.getViewer();
        if (!viewer || typeof Cesium === 'undefined') {
            console.warn('Cesium viewer not available; cannot render mission.');
            return;
        }

        const { clearPrevious = true, flyTo = true } = options;
        if (clearPrevious) this.clearPrevious();

        const createdEntities = [];

        // 1) Render the requested area (top-level waypoints polygon/square/circle)
        try {
            if (Array.isArray(apiData?.waypoints) && apiData.waypoints.length > 0) {
                const area = apiData.waypoints[0];
                if (Array.isArray(area.coordinates) && area.coordinates.length >= 3) {
                    const positions = area.coordinates.map(c =>
                        Cesium.Cartesian3.fromDegrees(c.lon, c.lat, Number.isFinite(c.alt) ? c.alt : 0)
                    );

                    const areaId = `mission-area-${Date.now()}`;
                    const areaEntity = viewer.entities.add({
                        id: areaId,
                        name: area.name || 'Mission Area',
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy(positions),
                            material: Cesium.Color.ORANGE.withAlpha(0.2),
                            outline: true,
                            outlineColor: Cesium.Color.ORANGE,
                            heightReference: Cesium.HeightReference.NONE
                        }
                    });
                    this.renderedEntityIds.add(areaId);
                    createdEntities.push(areaEntity);
                }
            }
        } catch (err) {
            console.error('Failed to render mission area:', err);
        }

        // 2) Render generated coverage/path waypoints as a single polyline (performance-friendly)
        try {
            const fnEntry = Array.isArray(apiData?.executed_functions) ? apiData.executed_functions[0] : null;
            const payload = Array.isArray(fnEntry) ? fnEntry[1] : null;
            const generatedWaypoints = Array.isArray(payload?.waypoints) ? payload.waypoints : [];

            if (generatedWaypoints.length > 0) {
                const coordsArray = [];
                for (const wp of generatedWaypoints) {
                    const p = wp?.position;
                    if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
                        const alt = Number.isFinite(p.alt) ? p.alt : 0;
                        coordsArray.push(p.lon, p.lat, alt);
                    }
                }

                if (coordsArray.length >= 3 * 2) { // at least two points
                    const polylineId = `mission-path-${Date.now()}`;
                    const polylineEntity = viewer.entities.add({
                        id: polylineId,
                        name: 'Mission Path',
                        polyline: {
                            positions: Cesium.Cartesian3.fromDegreesArrayHeights(coordsArray),
                            width: 2,
                            material: new Cesium.PolylineOutlineMaterialProperty({
                                color: Cesium.Color.CYAN,
                                outlineColor: Cesium.Color.BLACK,
                                outlineWidth: 1
                            }),
                            clampToGround: false
                        }
                    });
                    this.renderedEntityIds.add(polylineId);
                    createdEntities.push(polylineEntity);

                    // Mark start and end points for clarity
                    const startLon = coordsArray[0];
                    const startLat = coordsArray[1];
                    const startAlt = coordsArray[2];
                    const endLon = coordsArray[coordsArray.length - 3];
                    const endLat = coordsArray[coordsArray.length - 2];
                    const endAlt = coordsArray[coordsArray.length - 1];

                    const startId = `${polylineId}-start`;
                    const endId = `${polylineId}-end`;

                    const startEntity = viewer.entities.add({
                        id: startId,
                        position: Cesium.Cartesian3.fromDegrees(startLon, startLat, startAlt),
                        point: { pixelSize: 8, color: Cesium.Color.LIME },
                        label: {
                            text: 'Start',
                            font: '14px sans-serif',
                            fillColor: Cesium.Color.LIME,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            pixelOffset: new Cesium.Cartesian2(0, -20)
                        }
                    });

                    const endEntity = viewer.entities.add({
                        id: endId,
                        position: Cesium.Cartesian3.fromDegrees(endLon, endLat, endAlt),
                        point: { pixelSize: 8, color: Cesium.Color.RED },
                        label: {
                            text: 'End',
                            font: '14px sans-serif',
                            fillColor: Cesium.Color.RED,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            pixelOffset: new Cesium.Cartesian2(0, -20)
                        }
                    });

                    this.renderedEntityIds.add(startId);
                    this.renderedEntityIds.add(endId);
                    createdEntities.push(startEntity, endEntity);
                }
            }
        } catch (err) {
            console.error('Failed to render mission path:', err);
        }

        // 3) Fly to the rendered content
        try {
            if (flyTo && createdEntities.length > 0) {
                const targets = createdEntities.filter(Boolean);
                if (targets.length > 0) {
                    this.viewer.flyTo(targets, {
                        duration: 1.2
                    });
                }
            }
        } catch (err) {
            console.warn('FlyTo failed:', err);
        }
    }
}

// Export for global access
window.ApiMissionRenderer = ApiMissionRenderer;


