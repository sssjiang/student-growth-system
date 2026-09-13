import { baseApi, uploadBody } from './baseApi.js';

export const teacherAPI = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTeacherDashboard: build.query({
      query: () => `/teacher/dashboard`,
      providesTags: ['Dashboard'],
    }),
    getStudents: build.query({
      query: () => `/teacher/students`,
      providesTags: ['Students'],
    }),
    searchStudents: build.mutation({
      query: (query) => ({
        url: `/teacher/search`,
        method: 'POST',
        body: { query },
      }),
    }),
    getStudentGrades: build.query({
      query: (id) => `/teacher/students/${id}/grades`,
      providesTags: ['Grades'],
    }),
    getStudentReport: build.query({
      query: (id) => `/teacher/students/${id}/report`,
      providesTags: ['Reports'],
    }),
    createStudentReport: build.mutation({
      query: (id) => ({
        url: `/teacher/students/${id}/report`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Reports', 'Dashboard'],
    }),
    importGrades: build.mutation({
      query: (file) => ({
        url: `/teacher/grades/import`,
        method: 'POST',
        body: uploadBody(file),
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Grades', 'Students', 'Reports', 'Dashboard'],
    }),
    getCredentials: build.query({
      query: (status = '') =>
        `/teacher/credentials?status=${encodeURIComponent(status)}`,
      providesTags: ['Credentials'],
    }),
    reviewCredential: build.mutation({
      query: ({ id, status, comment }) => ({
        url: `/teacher/credentials/${id}/review`,
        method: 'PUT',
        body: { status, comment },
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Credentials', 'Dashboard'],
    }),
    getCredentialAnalysis: build.query({
      query: (id) => `/teacher/credentials/${id}/analysis`,
      providesTags: ['Analysis'],
    }),
    analyzeCredential: build.mutation({
      query: (id) => ({
        url: `/teacher/credentials/${id}/analysis`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Analysis', 'Credentials'],
    }),
    getKnowledgeDocuments: build.query({
      query: () => `/teacher/knowledge`,
      providesTags: ['Knowledge'],
    }),
    uploadKnowledgeDocument: build.mutation({
      query: ({ file, metadata }) => ({
        url: `/teacher/knowledge`,
        method: 'POST',
        body: uploadBody(file, metadata),
      }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Knowledge', 'Dashboard'],
    }),
    deleteKnowledgeDocument: build.mutation({
      query: (id) => ({ url: `/teacher/knowledge/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, error) =>
        error ? [] : ['Knowledge', 'Dashboard'],
    }),
    reindexKnowledgeDocument: build.mutation({
      query: (id) => ({
        url: `/teacher/knowledge/${id}/reindex`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, error) => (error ? [] : ['Knowledge']),
    }),
  }),
});

export const {
  useGetTeacherDashboardQuery,
  useLazyGetTeacherDashboardQuery,
  useGetStudentsQuery,
  useLazyGetStudentsQuery,
  useSearchStudentsMutation,
  useGetStudentGradesQuery,
  useLazyGetStudentGradesQuery,
  useGetStudentReportQuery,
  useLazyGetStudentReportQuery,
  useCreateStudentReportMutation,
  useImportGradesMutation,
  useGetCredentialsQuery,
  useLazyGetCredentialsQuery,
  useReviewCredentialMutation,
  useGetCredentialAnalysisQuery,
  useLazyGetCredentialAnalysisQuery,
  useAnalyzeCredentialMutation,
  useGetKnowledgeDocumentsQuery,
  useLazyGetKnowledgeDocumentsQuery,
  useUploadKnowledgeDocumentMutation,
  useDeleteKnowledgeDocumentMutation,
  useReindexKnowledgeDocumentMutation,
} = teacherAPI;
