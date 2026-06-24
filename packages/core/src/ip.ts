/**
 * Normalize an IP string: strip ::ffff: prefix, brackets, lowercase.
 */
export function normalizeIp(ip: string | undefined): string | undefined {
    if (!ip) {
        return undefined;
    }

    let normalized = ip.trim();

    // Strip brackets (IPv6 in URLs)
    if (normalized.startsWith("[") && normalized.endsWith("]")) {
        normalized = normalized.slice(1, -1);
    }

    // Strip IPv4-mapped IPv6 prefix
    if (normalized.toLowerCase().startsWith("::ffff:")) {
        normalized = normalized.slice(7);
    }

    return normalized.toLowerCase();
}

/**
 * Return true if the IP is publicly routable
 * (not RFC1918, loopback, link-local, CGNAT, ULA).
 */
export function isPublicIp(ip: string): boolean {
    const normalized = normalizeIp(ip);
    if (!normalized) {
        return false;
    }

    // IPv4 checks
    if (!normalized.includes(":")) {
        const parts = normalized.split(".").map(Number);
        if (parts.length !== 4) {
            return false;
        }

        // Validate each octet is an integer in 0-255
        if (parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
            return false;
        }

        // Loopback: 127.0.0.0/8
        if (parts[0] === 127) {
            return false;
        }

        // RFC1918: 10.0.0.0/8
        if (parts[0] === 10) {
            return false;
        }

        // RFC1918: 172.16.0.0/12
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
            return false;
        }

        // RFC1918: 192.168.0.0/16
        if (parts[0] === 192 && parts[1] === 168) {
            return false;
        }

        // CGNAT: 100.64.0.0/10
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
            return false;
        }

        // Link-local: 169.254.0.0/16
        if (parts[0] === 169 && parts[1] === 254) {
            return false;
        }

        // 0.0.0.0
        if (parts.every((p) => p === 0)) {
            return false;
        }

        return true;
    }

    // IPv6 checks
    // Loopback: ::1
    if (normalized === "::1") {
        return false;
    }

    // ULA: fc00::/7
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
        return false;
    }

    // Link-local: fe80::/10
    if (normalized.startsWith("fe80")) {
        return false;
    }

    // Unspecified: ::
    if (normalized === "::") {
        return false;
    }

    return true;
}

/**
 * Determine the most likely real client IP from request headers.
 * Returns the first public IP found in the priority chain.
 */
export function getClientIp(headers: Headers): string | undefined {
    // 1. x-forwarded-for — split by comma, return first public IP
    const xff = headers.get("x-forwarded-for");
    if (xff) {
        const ips = xff
            .split(",")
            .map((s) => normalizeIp(s.trim()))
            .filter(Boolean) as string[];
        const publicIp = ips.find((ip) => isPublicIp(ip));
        if (publicIp) {
            return publicIp;
        }
    }

    // 2. Single-IP headers in priority order
    const singleHeaders = [
        "cf-connecting-ip",
        "true-client-ip",
        "x-real-ip",
        "x-client-ip",
        "fastly-client-ip",
        "fly-client-ip",
    ];

    for (const header of singleHeaders) {
        const value = headers.get(header);
        if (value) {
            const normalized = normalizeIp(value);
            if (normalized && isPublicIp(normalized)) {
                return normalized;
            }
        }
    }

    // 3. Last resort: return first candidate from xff even if private
    if (xff) {
        const ips = xff
            .split(",")
            .map((s) => normalizeIp(s.trim()))
            .filter(Boolean) as string[];
        if (ips.length > 0) {
            return ips[0];
        }
    }

    // 4. Check single-IP headers again, accepting private IPs
    for (const header of singleHeaders) {
        const value = headers.get(header);
        if (value) {
            const normalized = normalizeIp(value);
            if (normalized) {
                return normalized;
            }
        }
    }

    return undefined;
}

/**
 * Derive the /24 CIDR prefix from an IPv4 address.
 * Returns empty string for IPv6 or invalid addresses.
 */
export function getSubnet(ip: string): string {
    const normalized = normalizeIp(ip);
    if (!normalized) {
        return "";
    }

    if (normalized.includes(":")) {
        return "";
    }

    const parts = normalized.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
        return "";
    }

    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}
