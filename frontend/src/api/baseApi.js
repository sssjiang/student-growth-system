import { createApi } from '@reduxjs/toolkit/query/react';
import { signedOut } from '../store/authSlice.js';

const API_ROOT = import.meta.env?.VITE_API_ROOT || '/api';

// Also used by file downloads: Blobs never enter the Redux cache.
export async function authenticatedRequest(
  args,
  { getState, dispatch, signal }
) {
  const { token, version } = getState().auth;
  const {
    url,
    method = 'GET',
    body,
    blob = false,
  } = typeof args === 'string' ? { url: args } : args;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm)
    headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(`${API_ROOT}${url}`, {
      method,
      headers,
      signal,
      body: body === undefined || isForm ? body : JSON.stringify(body),
    });
    const data =
      blob && response.ok
        ? await response.blob()
        : await response.json().catch(() => ({}));
    if (getState().auth.version !== version) {
      return { error: { status: 'SESSION_CHANGED', message: '' } };
    }
    if (!response.ok) {
      if (response.status === 401 && token) dispatch(signedOut());
      return { error: { status: response.status, message: data.error || '' } };
    }
    return { data };
  } catch (error) {
    return { error: { status: 'FETCH_ERROR', message: error.message } };
  }
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: authenticatedRequest,
  tagTypes: [
    'Profile',
    'Grades',
    'Students',
    'Credentials',
    'Analysis',
    'Knowledge',
    'Conversations',
    'Reports',
    'Users',
    'Dashboard',
    'Traces',
  ],
  refetchOnMountOrArgChange: 30,
  endpoints: () => ({}),
});

export function uploadBody(file, metadata = {}) {
  const body = new FormData();
  if (file) body.append('file', file);
  Object.entries(metadata).forEach(([key, value]) => body.append(key, value));
  return body;
}
