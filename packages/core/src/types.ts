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
    /** When true, throw ApiError instead of returning null on failure. */
    throwOnError?: boolean;
}

// --- Cookie options ---

export interface CookieOptions {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number;
}

// --- RUM / Telemetry config ---

export interface RumConfig {
    endpoint?: string;
    sampleRate?: number;
}

// --- Account management types ---

export interface AccountProfile {
    id: string;
    email: string;
    name?: string;
    createdAt: string;
}

export interface ApiKey {
    id: string;
    prefix: string;
    name: string;
    type: "secret" | "publishable";
    scopes: string[];
    status: "active" | "expired" | "revoked";
    createdAt: string;
    expiresAt?: string;
}

export interface CreatedKey extends ApiKey {
    rawKey: string;
}

export interface DailyUsage {
    date: string;
    totalRequests: number;
}

export interface KeyUsage {
    keyPrefix: string;
    keyName: string;
    isActive: boolean;
    lastUsedAt?: string;
    rateLimitRemaining: number;
    rateLimitMax: number;
}

export interface AccountUsage {
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    monthlyCap: number | null;
    dailyUsage: DailyUsage[];
    keys: KeyUsage[];
}

export interface AuditLogEntry {
    id: string;
    action: string;
    actorId: string;
    actorLabel: string;
    targetType?: string;
    targetId?: string;
    createdAt: string;
}

export interface AuditLogResponse {
    entries: AuditLogEntry[];
    total: number;
}

export class ApiError extends Error {
    status: number;
    code: string;
    requestId?: string;

    constructor(status: number, code: string, message: string, requestId?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.requestId = requestId;
    }
}
