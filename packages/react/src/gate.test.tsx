import { describe, test, expect } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { GeoGate } from './gate';
import { GeoContext } from './context';
import type { Geo } from '@netloc8/core';

function renderWithGeo(geo: Geo, element: React.ReactElement): string {
    return renderToString(
        React.createElement(GeoContext.Provider, { value: geo }, element)
    );
}

describe('GeoGate', () => {
    const usGeo: Geo = {
        location: {
            country: { code: 'US', name: 'United States', unions: [] },
            region: { code: 'CA', name: 'California' },
            city: 'Mountain View',
        },
    };

    const deGeo: Geo = {
        location: {
            country: { code: 'DE', name: 'Germany', unions: ['EU'] },
            region: { code: 'BY', name: 'Bavaria' },
            city: 'Munich',
        },
    };

    test('renders children when country matches', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { country: 'US' }, 'Hello US')
        );
        expect(html).toContain('Hello US');
    });

    test('renders fallback when country does not match', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { country: 'DE', fallback: React.createElement('span', null, 'Not DE') }, 'Hello DE')
        );
        expect(html).not.toContain('Hello DE');
        expect(html).toContain('Not DE');
    });

    test('renders children when country is in array', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { country: ['US', 'CA', 'GB'] }, 'North America')
        );
        expect(html).toContain('North America');
    });

    test('renders children when region matches', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { region: 'CA' }, 'California')
        );
        expect(html).toContain('California');
    });

    test('renders children when city matches', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { city: 'Mountain View' }, 'MV')
        );
        expect(html).toContain('MV');
    });

    test('eu=true matches country with EU in unions', () => {
        const html = renderWithGeo(deGeo,
            React.createElement(GeoGate, { eu: true }, 'EU content')
        );
        expect(html).toContain('EU content');
    });

    test('eu=true does not match non-EU country', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { eu: true }, 'EU content')
        );
        expect(html).not.toContain('EU content');
    });

    test('eu=false matches non-EU country', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { eu: false }, 'Non-EU content')
        );
        expect(html).toContain('Non-EU content');
    });

    test('AND logic: all conditions must match', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { country: 'US', region: 'CA', city: 'Mountain View' }, 'Exact match')
        );
        expect(html).toContain('Exact match');
    });

    test('AND logic: fails when one condition mismatches', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, { country: 'US', region: 'NY' }, 'NY content')
        );
        expect(html).not.toContain('NY content');
    });

    test('renders children when no conditions specified', () => {
        const html = renderWithGeo(usGeo,
            React.createElement(GeoGate, {}, 'Always visible')
        );
        expect(html).toContain('Always visible');
    });

    test('handles empty geo gracefully', () => {
        const html = renderWithGeo({},
            React.createElement(GeoGate, { country: 'US', fallback: React.createElement('span', null, 'fallback') }, 'US content')
        );
        expect(html).not.toContain('US content');
        expect(html).toContain('fallback');
    });
});
