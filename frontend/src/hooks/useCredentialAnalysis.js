import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAnalyzeCredentialMutation,
  useGetCredentialAnalysisQuery,
} from '../api/TeacherAPI';

export function useCredentialAnalysis(id, enabled) {
  const [pollingInterval, setPollingInterval] = useState(2000);
  const query = useGetCredentialAnalysisQuery(id, {
    skip: !enabled,
    pollingInterval,
    refetchOnMountOrArgChange: true,
  });
  const [analyze, mutation] = useAnalyzeCredentialMutation();
  const requested = useRef(null);
  const analysis = query.currentData?.analysis;
  const runAnalysis = useCallback(() => {
    analyze(id);
  }, [analyze, id]);
  useEffect(() => {
    setPollingInterval(
      ['pending', 'processing'].includes(analysis?.analysis_status) ? 2000 : 0
    );
  }, [analysis?.analysis_status]);
  useEffect(() => {
    if (
      enabled &&
      query.currentData &&
      !analysis &&
      !query.isFetching &&
      requested.current !== id
    ) {
      requested.current = id;
      runAnalysis();
    }
  }, [enabled, query.currentData, query.isFetching, analysis, id, runAnalysis]);
  return {
    analysis,
    analyzing: enabled && (query.isLoading || mutation.isLoading),
    error: mutation.error || query.error,
    runAnalysis,
  };
}
