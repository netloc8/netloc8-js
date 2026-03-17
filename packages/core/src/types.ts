// --- Geo response sub-types (matches API GeolocationResult schema) ---

export interface GeoQuery {
    type?: string;
    value?: string;
    ipVersion?: number;
}

export interface GeoContinent {
    code?: string;
    name?: string;
}

export interface GeoCountry {
    code?: string;
    name?: string;
    flag?: string;
    unions?: string[];
}

export interface GeoRegion {
    code?: string;
    name?: string;
}

export interface GeoCoordinates {
    latitude?: number;
    longitude?: number;
    accuracyRadius?: number;
}

export interface GeoLocation {
    continent?: GeoContinent;
    country?: GeoCountry;
    region?: GeoRegion;
    district?: string;
    city?: string;
    postalCode?: string;
    coordinates?: GeoCoordinates;
    timezone?: string;
    utcOffset?: string;
    geoConfidence?: number;
    /** SDK-only field — true when timezone was confirmed by the browser. */
    timezoneFromClient?: boolean;
}

export interface GeoNetwork {
    asn?: string;
    organization?: string;
    domain?: string;
}

export interface GeoSources {
    geo?: string[];
    asn?: string[];
    tz?: string[];
}

export interface GeoMeta {
    precision?: string;
    tier?: string;
    requestId?: string;
    degraded?: boolean;
}

// --- Top-level Geo response ---

export interface Geo {
    query?: GeoQuery;
    location?: GeoLocation;
    network?: GeoNetwork;
    sources?: GeoSources;
    meta?: GeoMeta;
}

// --- API error response ---

export interface ApiErrorResponse {
    query?: { type?: string; value?: string };
    error?: { code?: string; message?: string };
    meta?: { requestId?: string };
}

// --- Fetch options ---

export interface FetchGeoOptions {
    apiKey?: string;
    apiUrl?: string;
    timeout?: number;
    clientId?: string;
    /** When true, skip the API key requirement and omit X-API-Key from headers. */
    allowAnonymous?: boolean;
}

// --- Cookie options ---

export interface CookieOptions {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
}

// --- RUM / Telemetry config ---

export interface RumConfig {
    endpoint?: string;
    sampleRate?: number;
}
