const API_PREFIX = '/api/v1';
const API_BASE = resolveApiBase(import.meta.env.VITE_API_BASE_URL);

async function request(path) {
  const response = await fetch(buildUrl(path));
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (isJson && payload?.message) {
      throw new Error(payload.message);
    }

    throw new Error(typeof payload === 'string' && payload ? payload : 'Request failed');
  }

  if (!isJson) {
    throw new Error('Unexpected non-JSON response from API');
  }

  if (!payload.success) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload.data;
}

export function getHome() {
  return request('/home');
}

export function getTopUpcoming() {
  const today = new Date();
  const date = String(today.getDate());
  return request(`/schedule?date=${encodeURIComponent(date)}`);
}

export function searchAnime(keyword, page = 1) {
  const params = new URLSearchParams({
    keyword,
    page: String(page),
  });

  return request(`/search?${params.toString()}`);
}

export function getAnimeInfo(id) {
  return request(`/anime/${encodeURIComponent(id)}`);
}

export function getEpisodes(id) {
  return request(`/episodes/${encodeURIComponent(id)}`);
}

export function getServers(id) {
  return request(`/servers/${encodeURIComponent(id)}`);
}

export function getStream(id, server = 'hd-1', type = 'sub') {
  const params = new URLSearchParams({
    id,
    server,
    type,
  });

  return request(`/stream?${params.toString()}`);
}

function buildUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

function resolveApiBase(rawBase) {
  const fallbackBase = API_PREFIX;
  const candidate = String(rawBase || '').trim();

  if (!candidate) {
    return fallbackBase;
  }

  if (candidate.startsWith('/')) {
    return normalizePathBase(candidate);
  }

  try {
    const url = new URL(candidate);
    url.pathname = normalizeRemotePathname(url.pathname);
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallbackBase;
  }
}

function normalizePathBase(base) {
  const withoutTrailingSlash = base.replace(/\/+$/, '');

  if (
    withoutTrailingSlash === API_PREFIX ||
    withoutTrailingSlash.endsWith(API_PREFIX) ||
    withoutTrailingSlash.endsWith('/api')
  ) {
    return withoutTrailingSlash.endsWith('/api') ? `${withoutTrailingSlash}/v1` : withoutTrailingSlash;
  }

  return `${withoutTrailingSlash}${API_PREFIX}`;
}

function normalizeRemotePathname(pathname) {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';

  if (cleanPath === '/' || cleanPath === '') {
    return API_PREFIX;
  }

  if (cleanPath.endsWith(API_PREFIX)) {
    return cleanPath;
  }

  if (cleanPath.endsWith('/api')) {
    return `${cleanPath}/v1`;
  }

  return `${cleanPath}${API_PREFIX}`;
}
