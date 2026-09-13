import { baseApi } from './baseApi.js';

export const authAPI = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: `/auth/login`, method: 'POST', body: body }),
    }),
    register: build.mutation({
      query: (body) => ({ url: `/auth/register`, method: 'POST', body: body }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authAPI;
