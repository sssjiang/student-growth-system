import { useGetUploadLimitsQuery } from '../api/UploadAPI';
import { useQueryError } from './useQueryError';
import { fileExceedsLimit } from '../utils/files';

export function useUploadLimit(category) {
  const { data, error, refetch } = useGetUploadLimitsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    pollingInterval: 60000,
  });
  useQueryError(error);
  const limitMB = data?.upload_limits[category];
  const validateFile = async (file) => {
    if (!file) return;
    // The administrator may have changed the policy since the form was opened.
    const latest = await refetch();
    if (latest.error) throw latest.error;
    const limit = latest.data.upload_limits[category];
    if (fileExceedsLimit(file, limit)) {
      throw { code: 'FILE_TOO_LARGE', details: { limit_mb: limit } };
    }
  };
  return { limitMB, validateFile };
}
