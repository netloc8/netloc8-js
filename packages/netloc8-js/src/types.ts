export interface Geo {
    ip?: string;
    ipVersion?: number;
    continent?: string;
    continentName?: string;
    country?: string;
    countryName?: string;
    isEU?: boolean;
    region?: string;
    regionName?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    accuracyRadius?: number;
    precision?: string;
    isLimited?: boolean;
    limitReason?: string;
    timezoneFromClient?: boolean;
}

export interface FetchGeoOptions {
    apiKey?: string;
    apiUrl?: string;
    timeout?: number;
}

export interface CookieOptions {
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
}
