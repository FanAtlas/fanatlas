import { deriveDestinationIntelligence } from "../lib/destinationIntelligence";
import type { DestinationIdentity } from "../lib/destinationIntelligenceTypes";
import type { TravelDiscoveryCoordinate } from "../lib/travelDiscoveryTypes";

export function resolveTrustedDestinationCoordinates(destination: DestinationIdentity): TravelDiscoveryCoordinate | null {
  if (destination.type !== "city") return null;
  const city = deriveDestinationIntelligence({ references: [{ countryCode: destination.countryCode, city: destination.cityName }], generatedAt: "server" }).cities.find((entry) => entry.identity.id === destination.id);
  const coordinates = city?.coordinates.value;
  return coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)
    ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
    : null;
}
