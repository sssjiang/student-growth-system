import { createSlice } from '@reduxjs/toolkit';

export function readSession(storage = globalThis.localStorage) {
  try {
    const token = storage?.getItem('student_token');
    const user = JSON.parse(storage?.getItem('student_user') || 'null');
    if (
      token &&
      user?.id &&
      ['admin', 'teacher', 'student'].includes(user.role)
    ) {
      return { token, user, version: 0 };
    }
  } catch {
    // Malformed or unavailable browser storage must not prevent startup.
  }
  return { token: null, user: null, version: 0 };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { token: null, user: null, version: 0 },
  reducers: {
    signedIn: (state, { payload }) => {
      state.token = payload.token;
      state.user = payload.user;
      state.version += 1;
    },
    signedOut: (state) => {
      state.token = null;
      state.user = null;
      state.version += 1;
    },
  },
});

export const { signedIn, signedOut } = authSlice.actions;
export default authSlice.reducer;
