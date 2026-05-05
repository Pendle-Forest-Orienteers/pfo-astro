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
  coords?: LatLng;
}): LatLng | undefined {
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
      // fall through to manual coords
    }
  }
  return event.coords;
}
