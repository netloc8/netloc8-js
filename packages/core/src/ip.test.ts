import { describe, test, expect } from 'bun:test';
import { getClientIp, isPublicIp, normalizeIp } from './ip';

describe('normalizeIp', () => {
    test('strips ::ffff: prefix', () => {
        expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    test('strips brackets', () => {
        expect(normalizeIp('[::1]')).toBe('::1');
    });

    test('lowercases', () => {
        expect(normalizeIp('2001:DB8::1')).toBe('2001:db8::1');
    });

    test('trims whitespace', () => {
        expect(normalizeIp('  8.8.8.8  ')).toBe('8.8.8.8');
    });

    test('returns undefined for empty string', () => {
        expect(normalizeIp('')).toBeUndefined();
    });

    test('returns undefined for undefined', () => {
        expect(normalizeIp(undefined)).toBeUndefined();
    });
});

describe('isPublicIp', () => {
    test('public IPv4', () => {
        expect(isPublicIp('8.8.8.8')).toBe(true);
        expect(isPublicIp('1.1.1.1')).toBe(true);
    });

    test('loopback', () => {
        expect(isPublicIp('127.0.0.1')).toBe(false);
        expect(isPublicIp('127.255.255.255')).toBe(false);
    });

    test('RFC1918 10.x', () => {
        expect(isPublicIp('10.0.0.1')).toBe(false);
        expect(isPublicIp('10.255.255.255')).toBe(false);
    });

    test('RFC1918 172.16-31.x', () => {
        expect(isPublicIp('172.16.0.1')).toBe(false);
        expect(isPublicIp('172.31.255.255')).toBe(false);
        expect(isPublicIp('172.15.0.1')).toBe(true);
        expect(isPublicIp('172.32.0.1')).toBe(true);
    });

    test('RFC1918 192.168.x', () => {
        expect(isPublicIp('192.168.0.1')).toBe(false);
        expect(isPublicIp('192.169.0.1')).toBe(true);
    });

    test('CGNAT', () => {
        expect(isPublicIp('100.64.0.1')).toBe(false);
        expect(isPublicIp('100.127.255.255')).toBe(false);
        expect(isPublicIp('100.63.255.255')).toBe(true);
    });

    test('link-local', () => {
        expect(isPublicIp('169.254.0.1')).toBe(false);
    });

    test('IPv6 loopback', () => {
        expect(isPublicIp('::1')).toBe(false);
    });

    test('IPv6 ULA', () => {
        expect(isPublicIp('fc00::1')).toBe(false);
        expect(isPublicIp('fd12:3456::1')).toBe(false);
    });

    test('IPv6 link-local', () => {
        expect(isPublicIp('fe80::1')).toBe(false);
    });

    test('public IPv6', () => {
        expect(isPublicIp('2001:4860:4860::8888')).toBe(true);
    });
});

describe('getClientIp', () => {
    test('extracts from x-forwarded-for (first public)', () => {
        const headers = new Headers({
            'x-forwarded-for': '10.0.0.1, 8.8.8.8, 1.1.1.1',
        });
        expect(getClientIp(headers)).toBe('8.8.8.8');
    });

    test('extracts from cf-connecting-ip', () => {
        const headers = new Headers({
            'cf-connecting-ip': '1.2.3.4',
        });
        expect(getClientIp(headers)).toBe('1.2.3.4');
    });

    test('prefers x-forwarded-for over single-IP headers', () => {
        const headers = new Headers({
            'x-forwarded-for': '8.8.8.8',
            'cf-connecting-ip': '1.1.1.1',
        });
        expect(getClientIp(headers)).toBe('8.8.8.8');
    });

    test('falls back to private IP from xff', () => {
        const headers = new Headers({
            'x-forwarded-for': '10.0.0.1',
        });
        expect(getClientIp(headers)).toBe('10.0.0.1');
    });

    test('returns undefined when no headers', () => {
        const headers = new Headers();
        expect(getClientIp(headers)).toBeUndefined();
    });
});
