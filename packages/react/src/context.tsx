'use client';

import { createContext, type Context } from 'react';
import type { Geo } from '@netloc8/netloc8-js';

export const GeoContext: Context<Geo> = createContext<Geo>({});
