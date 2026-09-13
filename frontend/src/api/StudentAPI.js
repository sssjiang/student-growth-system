import { baseApi, uploadBody } from './baseApi.js';

export const studentAPI = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProfile: build.query({
      query: () => `/student/profile`,
      providesTags: ['Profile'],
    }),
    updateProfile: build.mutation({
      query: (body) => ({ url: `/student/profile`, method: 'PUT', body: body }),
      async onQueryStarted(_profile, { dispatch, getState, queryFulfilled }) {
        const version = getState().auth.version;
        try {
          const { data } = await queryFulfilled;
          if (getState().auth.version !== version) return;
          dispatch(
            studentAPI.util.updateQueryData('getProfile', undefined, () => data)
          );
        } catch {
          // Keep the saved profile unchanged; the page retains the draft for retry.
        }
      },
      invalidatesTags: (_result, error) =>
        error ? [] : ['Profile', 'Students'],
    }),
    getOwnGrades: build.query({
      query: () => `/student/grades`,
      providesTags: ['Grades'],
    }),
    getFiles: build.query({
      query: () => `/student/files`,
      providesTags: ['Credentials'],
    }),
    uploadFile: build.mutation({
      query: ({ file, metadata }) => ({
        url: `/student/files`,
        method: 'POST',
        body: uploadBody(file, metadata),
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Credentials', 'Dashboard'],
    }),
    deleteFile: build.mutation({
      query: (id) => ({ url: `/student/files/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Credentials', 'Dashboard'],
    }),
    resubmitFile: build.mutation({
      query: ({ id, file, metadata }) => ({
        url: `/student/files/${id}/resubmit`,
        method: 'POST',
        body: uploadBody(file, metadata),
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Credentials', 'Analysis'],
    }),
    getTutorConversations: build.query({
      query: () => `/student/tutor/conversations`,
      providesTags: ['Conversations'],
    }),
    getTutorConversation: build.query({
      query: (id) => `/student/tutor/conversations/${id}`,
      providesTags: ['Conversations'],
    }),
    sendTutorMessage: build.mutation({
      query: ({ subject, message, conversationId }) => ({
        url: `/student/tutor/chat`,
        method: 'POST',
        body: { subject, message, conversation_id: conversationId || null },
      }),
      async onQueryStarted(
        { subject, message },
        { dispatch, getState, queryFulfilled }
      ) {
        const version = getState().auth.version;
        try {
          const { data } = await queryFulfilled;
          if (getState().auth.version !== version) return;
          const id = data.conversation_id;
          const previous =
            studentAPI.endpoints.getTutorConversation.select(id)(
              getState()
            ).data;
          // Show the accepted exchange immediately; invalidation reloads canonical message IDs.
          await dispatch(
            studentAPI.util.upsertQueryData('getTutorConversation', id, {
              conversation: previous?.conversation || { id, subject },
              messages: [
                ...(previous?.messages || []),
                {
                  id: `sent-${data.message.id}`,
                  role: 'user',
                  content: message,
                  citations: [],
                },
                data.message,
              ],
            })
          );
        } catch {
          // The mutation error is displayed by the submitting page.
        }
      },
      invalidatesTags: (_result, error) =>
        error ? [] : ['Conversations', 'Dashboard', 'Traces'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useUpdateProfileMutation,
  useGetOwnGradesQuery,
  useLazyGetOwnGradesQuery,
  useGetFilesQuery,
  useLazyGetFilesQuery,
  useUploadFileMutation,
  useDeleteFileMutation,
  useResubmitFileMutation,
  useGetTutorConversationsQuery,
  useLazyGetTutorConversationsQuery,
  useGetTutorConversationQuery,
  useLazyGetTutorConversationQuery,
  useSendTutorMessageMutation,
} = studentAPI;
