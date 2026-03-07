import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Mock next/server before importing proxy
mock.module('next/server', () => {
    class MockNextResponse {
        public headers: Headers;
        public cookies: {
            set: (name: string, value: string, options?: Record<string, unknown>) => void;
        };

        private _body: unknown;
        private _status: number;

        constructor(body?: unknown, init?: { status?: number; headers?: Headers }) {
            this._body = body;
            this._status = init?.status ?? 200;
            this.headers = init?.headers ?? new Headers();
            const cookieStore: Record<string, string> = {};
            this.cookies = {
                set: (name: string, value: string) => {
                    cookieStore[name] = value;
                },
            };
        }

        static next(options?: { request?: { headers?: Headers } }) {
            const resp = new MockNextResponse();
            if (options?.request?.headers) {
                (resp as unknown as Record<string, unknown>)._requestHeaders = options.request.headers;
            }
            return resp;
        }

        static redirect(url: URL, status: number = 307) {
            const resp = new MockNextResponse(null, { status });
            resp.headers.set('location', url.toString());
            return resp;
        }
    }

    return { NextResponse: MockNextResponse };
});

const { createProxy, withGeoRedirect } = await import('./proxy');

function createMockRequest(options: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    url?: string;
} = {}) {
    const headers = new Headers(options.headers ?? {});
    const cookieMap = options.cookies ?? {};
    const url = new URL(options.url ?? 'https://example.com/');

    // Add clone() for withGeoRedirect
    (url as unknown as Record<string, unknown>).clone = () => new URL(url.toString());

    return {
        headers,
        cookies: {
            get: (name: string) => {
                const value = cookieMap[name];
                return value !== undefined ? { name, value } : undefined;
            },
        },
        nextUrl: url,
    } as unknown as import('next/server').NextRequest;
}

describe('createProxy', () => {
    beforeEach(() => {
        process.env.NETLOC8_API_KEY = 'sk_test';
        process.env.NODE_ENV = 'development';
    });

    test('returns a function', () => {
        const proxy = createProxy();
        expect(typeof proxy).toBe('function');
    });

    test('cookie fast path: skips API call when cookie has timezoneFromClient + matching IP', async () => {
        let fetchCalled = false;
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() => {
            fetchCalled = true;
            return Promise.resolve(new Response('{}', { status: 200 }));
        }) as unknown as typeof fetch;

        const cookieGeo = JSON.stringify({
            ip: '24.216.76.94',
            country: 'US',
            timezone: 'America/Chicago',
            timezoneFromClient: true,
        });

        const proxy = createProxy({ testIp: '24.216.76.94' });
        const request = createMockRequest({
            cookies: { '__netloc8_geo': encodeURIComponent(cookieGeo) },
        });

        await proxy(request);
        expect(fetchCalled).toBe(false);

        globalThis.fetch = originalFetch;
    });

    test('calls API when no cookie', async () => {
        let fetchCalled = false;
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() => {
            fetchCalled = true;
            return Promise.resolve(new Response(JSON.stringify({
                ip: '24.216.76.94',
                country: 'US',
                timezone: 'America/Chicago',
            }), { status: 200 }));
        }) as unknown as typeof fetch;

        const proxy = createProxy({ testIp: '24.216.76.94' });
        const request = createMockRequest();

        await proxy(request);
        expect(fetchCalled).toBe(true);

        globalThis.fetch = originalFetch;
    });

    test('calls custom handler with geo data', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = mock(() =>
            Promise.resolve(new Response(JSON.stringify({
                ip: '24.216.76.94',
                country: 'US',
            }), { status: 200 }))
        ) as unknown as typeof fetch;

        let handlerCalled = false;
        let handlerGeo: unknown;

        const proxy = createProxy({
            testIp: '24.216.76.94',
            handler: (_req, geo) => {
                handlerCalled = true;
                handlerGeo = geo;
                return undefined;
            },
        });

        const request = createMockRequest();
        await proxy(request);

        expect(handlerCalled).toBe(true);
        expect((handlerGeo as Record<string, unknown>).country).toBe('US');

        globalThis.fetch = originalFetch;
    });
});

describe('withGeoRedirect', () => {
    test('redirects to locale-prefixed path', () => {
        const handler = withGeoRedirect({
            defaultLocale: 'en',
            localeMap: { FR: 'fr', DE: 'de' },
        });

        const request = createMockRequest({ url: 'https://example.com/about' });
        const result = handler(request, { country: 'FR' });

        expect(result).toBeDefined();
        expect(result!.headers.get('location')).toContain('/fr/about');
    });

    test('does not redirect for default locale', () => {
        const handler = withGeoRedirect({
            defaultLocale: 'en',
            localeMap: { US: 'en', FR: 'fr' },
        });

        const request = createMockRequest({ url: 'https://example.com/about' });
        const result = handler(request, { country: 'US' });

        expect(result).toBeUndefined();
    });

    test('does not redirect when path already has locale prefix', () => {
        const handler = withGeoRedirect({
            defaultLocale: 'en',
            localeMap: { FR: 'fr' },
        });

        const request = createMockRequest({ url: 'https://example.com/fr/about' });
        const result = handler(request, { country: 'FR' });

        expect(result).toBeUndefined();
    });

    test('skips excluded paths', () => {
        const handler = withGeoRedirect({
            defaultLocale: 'en',
            localeMap: { FR: 'fr' },
            excludePaths: ['/api'],
        });

        const request = createMockRequest({ url: 'https://example.com/api/data' });
        const result = handler(request, { country: 'FR' });

        expect(result).toBeUndefined();
    });
});
