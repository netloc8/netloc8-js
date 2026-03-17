declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

/** Default API base URL. */
export const DEFAULT_API_URL = 'https://api.netloc8.com';

/** SDK client identifier sent as X-NetLoc8-Client on every API request. */
export const CLIENT_ID: string = `${typeof __PKG_NAME__ !== 'undefined' ? __PKG_NAME__ : '@netloc8/core'}/${typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : 'dev'}`;
