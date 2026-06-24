import { fetchApi, resolveApiUrl } from "./api";
import type { AccountProfile, AccountUsage, ApiKey, AuditLogResponse, CreatedKey, FetchGeoOptions } from "./types";

/**
 * Fetch the authenticated user's account profile.
 * Returns the profile object on success, or null on error.
 */
export async function fetchProfile(options?: FetchGeoOptions): Promise<AccountProfile | null> {
    const url = `${resolveApiUrl(options)}/v1/account/me`;
    return fetchApi<AccountProfile>(url, "Get profile failed", options);
}

/**
 * Fetch API usage statistics for the authenticated NetLoc8 account.
 * Returns the usage summary on success, or null on error.
 */
export async function fetchUsage(options?: FetchGeoOptions): Promise<AccountUsage | null> {
    const url = `${resolveApiUrl(options)}/v1/account/me/usage`;
    return fetchApi<AccountUsage>(url, "Get usage failed", options);
}

/**
 * List all API keys on the authenticated NetLoc8 account.
 * Returns the array of keys on success, or null on error.
 */
export async function fetchApiKeys(options?: FetchGeoOptions): Promise<ApiKey[] | null> {
    const url = `${resolveApiUrl(options)}/v1/account/me/keys`;
    return fetchApi<ApiKey[]>(url, "List keys failed", options);
}

/**
 * Create a new API key on the authenticated NetLoc8 account.
 * Returns the created key (including its raw value) on success, or null on error.
 */
export async function createApiKey(
    params: { name: string; type?: string },
    options?: FetchGeoOptions,
): Promise<CreatedKey | null> {
    const url = `${resolveApiUrl(options)}/v1/account/me/keys`;
    return fetchApi<CreatedKey>(url, "Create key failed", {
        ...options,
        method: "POST",
        body: params,
    });
}

/**
 * Permanently delete (revoke) an API key by its ID.
 * Returns true on success, or false/null on error.
 */
export async function deleteApiKey(keyId: string, options?: FetchGeoOptions): Promise<boolean | null> {
    const url = `${resolveApiUrl(options)}/v1/account/me/keys/${encodeURIComponent(keyId)}`;
    const res = await fetchApi<unknown>(url, `Delete key failed for ${keyId}`, {
        ...options,
        method: "DELETE",
    });
    return res !== null;
}

/**
 * Renew an API key by resetting its expiration date.
 * Returns the updated key metadata on success, or null on error.
 */
export async function renewApiKey(keyId: string, options?: FetchGeoOptions): Promise<ApiKey | null> {
    const url = `${resolveApiUrl(options)}/v1/account/me/keys/${encodeURIComponent(keyId)}/renew`;
    return fetchApi<ApiKey>(url, `Renew key failed for ${keyId}`, {
        ...options,
        method: "POST",
    });
}

/**
 * Fetch the account's audit log entries.
 * Supports limit, offset, and action query parameter filters.
 * Returns the paginated response on success, or null on error.
 */
export async function fetchAuditLog(
    params?: { limit?: number; offset?: number; action?: string },
    options?: FetchGeoOptions,
): Promise<AuditLogResponse | null> {
    let url = `${resolveApiUrl(options)}/v1/account/me/audit`;

    if (params) {
        const queryParams = new URLSearchParams();
        if (params.limit && params.limit > 0) {
            queryParams.set("limit", String(params.limit));
        }
        if (params.offset && params.offset > 0) {
            queryParams.set("offset", String(params.offset));
        }
        if (params.action) {
            queryParams.set("action", params.action);
        }
        const qs = queryParams.toString();
        if (qs) {
            url += `?${qs}`;
        }
    }

    return fetchApi<AuditLogResponse>(url, "Get audit log failed", options);
}
