export type GeographicCoordinates = {
  latitude: number;
  longitude: number;
};

export type NearbyPlaceInput = GeographicCoordinates & {
  logicalPlaceId: string;
  name: string;
  order: number;
};

export type NearbyPlacePair = {
  firstLogicalPlaceId: string;
  secondLogicalPlaceId: string;
  distanceMeters: number;
};

export type NearbyPlaceGroupMember = {
  logicalPlaceId: string;
  name: string;
  order: number;
};

export type NearbyPlaceGroup = {
  id: string;
  places: readonly NearbyPlaceGroupMember[];
  pairDistances: readonly NearbyPlacePair[];
  minimumDistanceMeters: number;
  maximumDistanceMeters: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

export const TRIP_NEARBY_DISTANCE_THRESHOLD_METERS = 804.672;

export function getSavedPlaceCoordinates(place: unknown): GeographicCoordinates | null {
  const record = asRecord(place);
  if (!record) return null;

  const directCoordinates = readCoordinates(record.lat, record.lng) ||
    readCoordinates(record.latitude, record.longitude);
  if (directCoordinates) return directCoordinates;

  const coordinates = asRecord(record.coordinates);
  const nestedCoordinates = coordinates
    ? readCoordinates(coordinates.lat, coordinates.lng) || readCoordinates(coordinates.latitude, coordinates.longitude)
    : null;
  if (nestedCoordinates) return nestedCoordinates;

  const mapPosition = asRecord(record.mapPosition);
  return mapPosition
    ? readCoordinates(mapPosition.lat, mapPosition.lng) || readCoordinates(mapPosition.latitude, mapPosition.longitude)
    : null;
}

export function calculateHaversineDistanceMeters(
  origin: GeographicCoordinates,
  destination: GeographicCoordinates
) {
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);

  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function findNearbyPlacePairs(
  places: readonly NearbyPlaceInput[],
  thresholdMeters = TRIP_NEARBY_DISTANCE_THRESHOLD_METERS
): NearbyPlacePair[] {
  return getAllNearbyPlacePairDistances(places)
    .filter((pair) => pair.distanceMeters <= thresholdMeters)
    .sort(compareNearbyPairs)
    .map(toPublicPair);
}

export function findNearbyPlaceGroups(
  places: readonly NearbyPlaceInput[],
  thresholdMeters = TRIP_NEARBY_DISTANCE_THRESHOLD_METERS
): NearbyPlaceGroup[] {
  const nodes = places.filter(isValidNearbyPlaceInput).sort(compareNearbyInputs);
  if (nodes.length < 2) return [];

  const nodesById = new Map(nodes.map((node) => [node.logicalPlaceId, node]));
  const allPairs = getAllNearbyPlacePairDistances(nodes);
  const qualifyingPairs = allPairs.filter((pair) => pair.distanceMeters <= thresholdMeters);
  if (qualifyingPairs.length === 0) return [];

  const adjacency = new Map(nodes.map((node) => [node.logicalPlaceId, new Set<string>()]));
  qualifyingPairs.forEach((pair) => {
    adjacency.get(pair.firstLogicalPlaceId)?.add(pair.secondLogicalPlaceId);
    adjacency.get(pair.secondLogicalPlaceId)?.add(pair.firstLogicalPlaceId);
  });

  const visited = new Set<string>();
  const groups: NearbyPlaceGroupWithSort[] = [];

  nodes.forEach((node) => {
    if (visited.has(node.logicalPlaceId)) return;

    const componentIds = collectConnectedComponent(node.logicalPlaceId, adjacency, visited);
    if (componentIds.length < 2) return;

    const componentIdSet = new Set(componentIds);
    const members = componentIds
      .map((id) => nodesById.get(id))
      .filter((member): member is NearbyPlaceInput => Boolean(member))
      .sort(compareNearbyInputs)
      .map(({ logicalPlaceId, name, order }) => ({ logicalPlaceId, name, order }));
    if (members.length < 2) return;

    const componentQualifyingPairs = qualifyingPairs.filter((pair) => pairBelongsToComponent(pair, componentIdSet));
    const componentAllPairs = allPairs.filter((pair) => pairBelongsToComponent(pair, componentIdSet));
    const minimumDistanceMeters = Math.min(...componentQualifyingPairs.map((pair) => pair.distanceMeters));
    const maximumDistanceMeters = Math.max(...componentAllPairs.map((pair) => pair.distanceMeters));
    if (!Number.isFinite(minimumDistanceMeters) || !Number.isFinite(maximumDistanceMeters)) return;

    const id = `group:${members.map((member) => member.logicalPlaceId).sort().join("|")}`;
    groups.push({
      id,
      places: members,
      pairDistances: componentAllPairs.sort(compareNearbyPairs).map(toPublicPair),
      minimumDistanceMeters,
      maximumDistanceMeters,
      firstOrder: members[0].order
    });
  });

  return groups
    .sort(compareNearbyGroups)
    .map(({ firstOrder: _firstOrder, ...group }) => group);
}

export function selectNonOverlappingNearbyPairs(
  places: readonly NearbyPlaceInput[],
  thresholdMeters = TRIP_NEARBY_DISTANCE_THRESHOLD_METERS
): NearbyPlacePair[] {
  const selected: NearbyPlacePair[] = [];
  const usedPlaceIds = new Set<string>();

  findNearbyPlacePairs(places, thresholdMeters).forEach((pair) => {
    if (usedPlaceIds.has(pair.firstLogicalPlaceId) || usedPlaceIds.has(pair.secondLogicalPlaceId)) return;
    usedPlaceIds.add(pair.firstLogicalPlaceId);
    usedPlaceIds.add(pair.secondLogicalPlaceId);
    selected.push(pair);
  });

  return selected;
}

type NearbyPlacePairWithOrder = NearbyPlacePair & {
  firstOrder: number;
  secondOrder: number;
};

type NearbyPlaceGroupWithSort = NearbyPlaceGroup & {
  firstOrder: number;
};

function getAllNearbyPlacePairDistances(places: readonly NearbyPlaceInput[]): NearbyPlacePairWithOrder[] {
  const pairs: NearbyPlacePairWithOrder[] = [];

  for (let firstIndex = 0; firstIndex < places.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < places.length; secondIndex += 1) {
      const first = places[firstIndex];
      const second = places[secondIndex];
      if (first.logicalPlaceId === second.logicalPlaceId) continue;

      const distanceMeters = calculateHaversineDistanceMeters(first, second);
      if (!Number.isFinite(distanceMeters)) continue;

      pairs.push({
        firstLogicalPlaceId: first.logicalPlaceId,
        secondLogicalPlaceId: second.logicalPlaceId,
        distanceMeters,
        firstOrder: first.order,
        secondOrder: second.order
      });
    }
  }

  return pairs;
}

function collectConnectedComponent(
  startId: string,
  adjacency: Map<string, Set<string>>,
  visited: Set<string>
) {
  const componentIds: string[] = [];
  const stack = [startId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);
    componentIds.push(currentId);
    const nextIds = [...(adjacency.get(currentId) || [])].sort();
    nextIds.forEach((nextId) => {
      if (!visited.has(nextId)) stack.push(nextId);
    });
  }

  return componentIds;
}

function compareNearbyPairs(first: NearbyPlacePairWithOrder, second: NearbyPlacePairWithOrder) {
  return first.distanceMeters - second.distanceMeters ||
    first.firstOrder - second.firstOrder ||
    first.secondOrder - second.secondOrder ||
    first.firstLogicalPlaceId.localeCompare(second.firstLogicalPlaceId) ||
    first.secondLogicalPlaceId.localeCompare(second.secondLogicalPlaceId);
}

function compareNearbyInputs(first: NearbyPlaceInput, second: NearbyPlaceInput) {
  return first.order - second.order ||
    first.logicalPlaceId.localeCompare(second.logicalPlaceId);
}

function compareNearbyGroups(first: NearbyPlaceGroupWithSort, second: NearbyPlaceGroupWithSort) {
  return first.firstOrder - second.firstOrder ||
    first.minimumDistanceMeters - second.minimumDistanceMeters ||
    first.id.localeCompare(second.id);
}

function pairBelongsToComponent(pair: NearbyPlacePair, componentIds: Set<string>) {
  return componentIds.has(pair.firstLogicalPlaceId) && componentIds.has(pair.secondLogicalPlaceId);
}

function toPublicPair({ firstOrder: _firstOrder, secondOrder: _secondOrder, ...pair }: NearbyPlacePairWithOrder) {
  return pair;
}

function isValidNearbyPlaceInput(place: NearbyPlaceInput) {
  return Boolean(place.logicalPlaceId) &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude) &&
    Number.isFinite(place.order) &&
    place.latitude >= -90 &&
    place.latitude <= 90 &&
    place.longitude >= -180 &&
    place.longitude <= 180;
}

function readCoordinates(latitudeValue: unknown, longitudeValue: unknown): GeographicCoordinates | null {
  const latitude = readFiniteNumber(latitudeValue);
  const longitude = readFiniteNumber(longitudeValue);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}
