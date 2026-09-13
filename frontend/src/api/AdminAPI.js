import { baseApi } from './baseApi.js';

export const adminAPI = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminDashboard: build.query({
      query: () => `/admin/dashboard`,
      providesTags: ['Dashboard'],
    }),
    getUsers: build.query({
      query: () => `/admin/users`,
      providesTags: ['Users'],
    }),
    createUser: build.mutation({
      query: (body) => ({ url: `/admin/users`, method: 'POST', body: body }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Users', 'Students', 'Dashboard'],
    }),
    getAdminKnowledge: build.query({
      query: () => `/admin/knowledge`,
      providesTags: ['Knowledge'],
    }),
    getKnowledgeChunks: build.query({
      query: (id) => `/admin/knowledge/${id}/chunks`,
      providesTags: ['Knowledge'],
    }),
    reindexAdminKnowledge: build.mutation({
      query: (id) => ({
        url: `/admin/knowledge/${id}/reindex`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, error) => (error ? [] : ['Knowledge']),
    }),
    getRagTraces: build.query({
      query: (subject = '') =>
        `/admin/rag-traces?subject=${encodeURIComponent(subject)}`,
      providesTags: ['Traces'],
    }),
    getRagTrace: build.query({
      query: (id) => `/admin/rag-traces/${id}`,
      providesTags: ['Traces'],
    }),
    getSettings: build.query({
      query: () => `/admin/settings`,
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useLazyGetAdminDashboardQuery,
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useCreateUserMutation,
  useGetAdminKnowledgeQuery,
  useLazyGetAdminKnowledgeQuery,
  useGetKnowledgeChunksQuery,
  useLazyGetKnowledgeChunksQuery,
  useReindexAdminKnowledgeMutation,
  useGetRagTracesQuery,
  useLazyGetRagTracesQuery,
  useGetRagTraceQuery,
  useLazyGetRagTraceQuery,
  useGetSettingsQuery,
  useLazyGetSettingsQuery,
} = adminAPI;
