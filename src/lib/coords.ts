/**
 * Resolve an event's coordinates by preferring the CMS map-pin output
 * (Decap "map" widget — a GeoJSON Point string) over the manual
 * lat/lng object. Returns undefined when neither is present.
 *
 * Used so committee members can drop a pin on the map and have all
 * downstream features (event detail Leaflet map, four external map
 * links, events list map) light up automatically.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

export function resolveCoords(event: {
  coordsGeoJson?: string;
  coordsPaste?: string;
  coords?: LatLng;
}): LatLng | undefined {
  // 1. Map-pin output (preferred — highest fidelity, dragged into place)
  if (event.coordsGeoJson) {
    try {
      const obj = JSON.parse(event.coordsGeoJson);
      if (
        obj &&
        obj.type === 'Point' &&
        Array.isArray(obj.coordinates) &&
        obj.coordinates.length >= 2
      ) {
        const [lng, lat] = obj.coordinates as [number, number];
        if (typeof lat === 'number' && typeof lng === 'number') {
          return { lat, lng };
        }
      }
    } catch {
      // fall through
    }
  }

  // 2. "lat, lng" paste from Google Maps
  if (event.coordsPaste) {
    const m = event.coordsPaste.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  // 3. Manual lat/lng object (fallback)
  return event.coords;
}
