'use client';

import { createContext, type Context } from 'react';
import type { Geo } from '@netloc8/netloc8-js';

/**
 * Internal sentinel — `null` means no provider is present.
 * The public default is cast to `Geo` so consumers see the correct type.
 */
export const GeoContext: Context<Geo> = createContext<Geo>(null as unknown as Geo);
