export type Coordinates = Readonly<{ latitude: number; longitude: number }>;
export type MapAddress = Readonly<{ label: string; coordinates: Coordinates }>;

export interface MapProvider {
  geocode(address: string): Promise<MapAddress | null>;
  reverseGeocode(coordinates: Coordinates): Promise<MapAddress | null>;
}

/** Explicit fixtures keep tests deterministic; no external geocoding occurs. */
export class MockMapProvider implements MapProvider {
  constructor(private readonly addresses: readonly MapAddress[] = []) {}

  async geocode(address: string): Promise<MapAddress | null> {
    return this.addresses.find((item) => item.label === address) ?? null;
  }

  async reverseGeocode(coordinates: Coordinates): Promise<MapAddress | null> {
    return this.addresses.find(
      (item) => item.coordinates.latitude === coordinates.latitude &&
        item.coordinates.longitude === coordinates.longitude,
    ) ?? null;
  }
}
