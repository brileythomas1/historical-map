export interface EventProperties {
  id: number;
  title: string;
  description?: string;
  start_year: number;
  end_year?: number | null;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: EventProperties;
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
