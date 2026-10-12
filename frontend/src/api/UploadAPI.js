import { baseApi } from './baseApi.js';

export const uploadAPI = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUploadLimits: build.query({
      query: () => '/upload-limits',
      providesTags: ['UploadLimits'],
    }),
    updateUploadLimits: build.mutation({
      query: (body) => ({
        url: '/admin/settings/upload-limits',
        method: 'PUT',
        body,
      }),
      async onQueryStarted(_limits, { dispatch, getState, queryFulfilled }) {
        const version = getState().auth.version;
        try {
          const { data } = await queryFulfilled;
          if (getState().auth.version !== version) return;
          dispatch(
            uploadAPI.util.updateQueryData(
              'getUploadLimits',
              undefined,
              (cached) => {
                cached.upload_limits = data.upload_limits;
              }
            )
          );
        } catch {
          // Keep the form draft available for retry.
        }
      },
      invalidatesTags: (_result, error) =>
        error ? [] : ['UploadLimits', 'Settings'],
    }),
  }),
});

export const { useGetUploadLimitsQuery, useUpdateUploadLimitsMutation } =
  uploadAPI;
