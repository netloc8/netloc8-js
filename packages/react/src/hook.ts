'use client';

import { useContext } from 'react';
import { GeoContext } from './context';
import type { Geo } from '@netloc8/netloc8-js';

/**
 * Hook to access geolocation data in client components.
 * Must be used inside a <NetLoc8Provider>.
 *
 * @throws {Error} if called outside a NetLoc8Provider.
 */
export function useGeo(): Geo {
    const geo = useContext(GeoContext);

    if (geo === null) {
        throw new Error('useGeo() must be used inside a <NetLoc8Provider>.');
    }

    return geo;
}
