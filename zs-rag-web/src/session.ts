import JSEncrypt from 'jsencrypt';
import { isDatasetContentRoute } from './dataset-routes';
import { isSettingsRoute } from './settings/routes';

const sessionCookie = 'ragflow_auth';
const publicKey = '-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArq9XTUSeYr2+N1h3Afl/z8Dse/2yD0ZGrKwx+EEEcdsBLca9Ynmx3nIB5obmLlSfmskLpBo0UACBmB5rEjBp2Q2f3AG3Hjd4B+gNCG6BDaawuDlgANIhGnaTLrIqWrrcm4EMzJOnAOI1fgzJRsOOUEfaS318Eq9OVO3apEyCCt0lOQK6PuksduOjVxtltDav+guVAA068NrPYmRNabVKRNLJpL8w4D44sfth5RvZ3q9t+6RTArpEtc5sh5ChzvqPOzKGMXW83C95TxmXqpbK6olN4RevSfVjEAgCydH6HN6OhtOQEcnrU97r9H0iZOWwbw3pVrZiUkuRD1R56Wzs2wIDAQAB-----END PUBLIC KEY-----';

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export function readSession() {
  return document.cookie.split('; ').find((cookie) => cookie.startsWith(sessionCookie + '='))
    ?.slice(sessionCookie.length + 1);
}

export function clearSession(authorization: string) {
  if (readSession() === authorization) {
    document.cookie = sessionCookie + '=; Path=/; Max-Age=0; SameSite=Lax';
  }
}

export async function apiEnvelope<T>(path: string, options: RequestInit = {}, authorization?: string) {
  const headers = new Headers(options.headers);
  if (authorization) headers.set('Authorization', authorization);
  if (options.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  if (response.status === 401) throw new ApiError(401, '登录会话已失效，请重新登录。');
  if (response.status === 403) throw new ApiError(403, '当前账户没有访问权限。');
  if (!response.ok) throw new ApiError(response.status, '服务暂时不可用，请重试。');

  const body: { code: number; message?: string; data: T; total_datasets?: number } = await response.json();
  if (body.code !== 0) throw new ApiError(response.status, body.message || '请求失败，请重试。');
  return body;
}

export function authenticate(email: string, password: string, nickname?: string) {
  const encoded = btoa(Array.from(new TextEncoder().encode(password), (byte) =>
    String.fromCharCode(byte),
  ).join(''));
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(publicKey);
  const encrypted = encryptor.encrypt(encoded);
  if (!encrypted) throw new Error('无法加密该密码，请检查密码长度。');
  return api(nickname === undefined ? '/api/v1/auth/login' : '/api/v1/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: encrypted, nickname }),
  });
}

export async function api<T>(path: string, options?: RequestInit, authorization?: string) {
  return (await apiEnvelope<T>(path, options, authorization)).data;
}

export function loginUrl(expired = false, current: Location = window.location) {
  const params = new URLSearchParams();
  if (expired) params.set('expired', '1');
  const path = current.pathname.replace(/\/+$/, '');
  if (path === '/datasets' || isSettingsRoute(path) || isDatasetContentRoute(path)) params.set('next', path + current.search);
  return '/login-next' + (params.size ? '?' + params : '');
}

export function loginDestination() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next?.startsWith('/')) return '/';
  const destination = new URL(next, window.location.origin);
  return destination.origin === window.location.origin && (destination.pathname === '/datasets' || isSettingsRoute(destination.pathname) || isDatasetContentRoute(destination.pathname))
    ? destination.pathname + destination.search
    : '/';
}
