import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from '@reduxjs/toolkit';
import auth, { readSession, signedIn, signedOut } from './authSlice.js';
import toast, { toastShown, toastCleared } from './toastSlice.js';
import { baseApi } from '../api/baseApi.js';

export function createAppStore({
  storage = globalThis.localStorage,
  toastDuration = 2600,
} = {}) {
  const listener = createListenerMiddleware();
  listener.startListening({
    matcher: isAnyOf(signedIn, signedOut),
    effect: (_action, api) => {
      for (const request of [
        ...api.dispatch(baseApi.util.getRunningQueriesThunk()),
        ...api.dispatch(baseApi.util.getRunningMutationsThunk()),
      ])
        request.abort();
      api.dispatch(baseApi.util.resetApiState());
      api.dispatch(toastCleared());
      const session = api.getState().auth;
      try {
        if (session.token && session.user) {
          storage?.setItem('student_token', session.token);
          storage?.setItem('student_user', JSON.stringify(session.user));
        } else {
          storage?.removeItem('student_token');
          storage?.removeItem('student_user');
        }
      } catch {
        // The in-memory session still works if persistence is disabled.
      }
    },
  });
  listener.startListening({
    actionCreator: toastShown,
    effect: async (_action, api) => {
      api.cancelActiveListeners();
      await api.delay(toastDuration);
      api.dispatch(toastCleared());
    },
  });
  return configureStore({
    reducer: { auth, toast, [baseApi.reducerPath]: baseApi.reducer },
    preloadedState: { auth: readSession(storage) },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(listener.middleware)
        .concat(baseApi.middleware),
  });
}

export const store = createAppStore();
