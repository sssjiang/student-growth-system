import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { authenticatedRequest } from '../api/baseApi';

export function useFileApi() {
  const dispatch = useDispatch();
  return useMemo(() => {
    const getBlob = (url) =>
      dispatch(async (dispatch, getState) => {
        const result = await authenticatedRequest(
          { url, blob: true },
          { dispatch, getState }
        );
        if (result.error) throw result.error;
        return result.data;
      });
    return {
      previewFile: (id) => getBlob(`/files/${id}?preview=1`),
      downloadFile: (id) => getBlob(`/files/${id}`),
      previewKnowledgeDocument: (id) =>
        getBlob(`/teacher/knowledge/${id}/file?preview=1`),
    };
  }, [dispatch]);
}
