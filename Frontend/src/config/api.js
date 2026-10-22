const apiOverride = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const serverOverride = (import.meta.env.VITE_SERVER_URL || '').trim().replace(/\/$/, '');
// One selected Backend for staff login, direct requests and public/candidate pages.
export const API_BASE_URL = apiOverride || `${serverOverride || 'http://localhost:5000'}/api`;
export const SERVER_BASE_URL = serverOverride || API_BASE_URL.replace(/\/api\/?$/, '');
if (apiOverride.startsWith('http') && serverOverride.startsWith('http') &&
    new URL(apiOverride).origin !== new URL(serverOverride).origin) {
  throw new Error('VITE_API_URL and VITE_SERVER_URL must target the same Backend');
}
