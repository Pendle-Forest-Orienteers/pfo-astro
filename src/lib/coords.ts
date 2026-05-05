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
  // 1. Google-Maps-style paste — highest priority because it's the most
  //    explicit "I want THIS exact location" input. If the user has
  //    typed/pasted coords here, those win over any saved map-pin
  //    (which may carry an old default or unintentional pin).
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

  // 2. Map-pin output from the Decap CMS map widget
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

  // 3. Legacy manual lat/lng object (older events created before the
  //    map widget existed — kept working without migration).
  return event.coords;
}
