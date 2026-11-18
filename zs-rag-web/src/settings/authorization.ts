import originalStorage, { adminStorage, getAuthorization as getOriginalAuthorization } from '@legacy-auth';
import { clearSession, loginUrl, readSession } from '../session';
import { isPublicWorkspaceRoute } from '../library-routes';

export { adminStorage };
export type { CredentialStorage } from '@legacy-auth';

export function getAuthorization() {
  if (isPublicWorkspaceRoute(location.pathname.replace(/\/+$/, ''))) {
    return new URLSearchParams(location.search).has('auth') ? getOriginalAuthorization() : '';
  }
  return readSession() ?? '';
}

export function redirectToLogin() {
  if (isPublicWorkspaceRoute(location.pathname.replace(/\/+$/, ''))) return;
  const host = window.parent;
  host.location.replace(loginUrl(true, host.location));
}

export default {
  ...originalStorage,
  getAuthorization,
  removeAll() {
    if (isPublicWorkspaceRoute(location.pathname.replace(/\/+$/, ''))) return;
    const session = readSession();
    if (session) clearSession(session);
    originalStorage.removeAll();
  },
};
