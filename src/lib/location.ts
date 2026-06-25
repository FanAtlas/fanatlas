export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type CoordinatePlace = {
  lat: number;
  lng: number;
};

export function distanceKm(origin: Coordinates, destination: CoordinatePlace) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(destination.lat - origin.latitude);
  const longitudeDelta = toRadians(destination.lng - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.lat);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(kilometers: number) {
  return kilometers < 1
    ? `${Math.max(1, Math.round(kilometers * 1000))} m`
    : `${kilometers.toFixed(1)} km`;
}

export function estimatedTravelMinutes(kilometers: number) {
  return Math.max(3, Math.round((kilometers / 25) * 60));
}

export function directionsUrl(place: CoordinatePlace) {
  const destination = encodeURIComponent(`${place.lat},${place.lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
