import { describe, test, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { GeoGate } from './gate';
import { GeoContext } from './context';
import type { Geo } from '@netloc8/core';
import type { GeoGateProps } from './gate';

function renderGate(geo: Geo, props: Omit<Partial<GeoGateProps>, 'children' | 'fallback'>, children: string, fallback?: string) {
    return renderToString(
        createElement(
            GeoContext.Provider,
            { value: geo },
            createElement(
                GeoGate,
                {
                    ...props,
                    fallback: fallback ? createElement('span', null, fallback) : undefined,
                    children: createElement('span', null, children),
                },
            )
        )
    );
}

describe('GeoGate', () => {
    test('renders children when country matches', () => {
        const html = renderGate({ country: 'US' }, { country: 'US' }, 'Visible');
        expect(html).toContain('Visible');
    });

    test('renders fallback when country does not match', () => {
        const html = renderGate({ country: 'DE' }, { country: 'US' }, 'Hidden', 'Fallback');
        expect(html).not.toContain('Hidden');
        expect(html).toContain('Fallback');
    });

    test('renders nothing when no match and no fallback', () => {
        const html = renderGate({ country: 'DE' }, { country: 'US' }, 'Hidden');
        expect(html).not.toContain('Hidden');
    });

    test('matches array of countries', () => {
        const html = renderGate({ country: 'GB' }, { country: ['US', 'GB', 'CA'] }, 'Visible');
        expect(html).toContain('Visible');
    });

    test('inverts with not prop', () => {
        const html = renderGate({ country: 'US' }, { country: 'US', not: true }, 'Hidden', 'Fallback');
        expect(html).not.toContain('Hidden');
        expect(html).toContain('Fallback');
    });

    test('matches EU countries', () => {
        const html = renderGate({ isEU: true }, { eu: true }, 'Visible');
        expect(html).toContain('Visible');
    });

    test('matches non-EU with eu={false}', () => {
        const html = renderGate({ isEU: false }, { eu: false }, 'Visible');
        expect(html).toContain('Visible');
    });

    test('AND logic: country + region must both match', () => {
        const html = renderGate(
            { country: 'US', region: 'CA' },
            { country: 'US', region: 'CA' },
            'Visible'
        );
        expect(html).toContain('Visible');
    });

    test('AND logic: fails if one field does not match', () => {
        const html = renderGate(
            { country: 'US', region: 'TX' },
            { country: 'US', region: 'CA' },
            'Hidden'
        );
        expect(html).not.toContain('Hidden');
    });

    test('renders children when no props specified', () => {
        const html = renderGate({}, {}, 'Visible');
        expect(html).toContain('Visible');
    });
});
