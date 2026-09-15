/**
 * Browser-bound replacement for the `@tanstack/router-core/isServer`
 * entry, aliased in package.json for the Parcel/Plasmo build.
 *
 * Parcel resolves that subpath through a node/server export condition and
 * ships `isServer = true`, which makes TanStack Router skip its Transitioner
 * and crash the extension popup (`router._rendered` never initializes). The
 * browser bundle always runs in a browser, so pin the client behavior —
 * identical to the package's own `isServer/client.ts` entry.
 */
export const isServer = false;
export const loadServerRoute = void 0;
