import { createSlice } from '@reduxjs/toolkit';

const toastSlice = createSlice({
  name: 'toast',
  initialState: { message: '' },
  reducers: {
    toastShown: (state, { payload }) => {
      state.message = payload;
    },
    toastCleared: (state) => {
      state.message = '';
    },
  },
});

export const { toastShown, toastCleared } = toastSlice.actions;
export default toastSlice.reducer;
