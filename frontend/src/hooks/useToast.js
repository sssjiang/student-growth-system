import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toastShown } from '../store/toastSlice';
import { errorMessage } from '../api/errors';

export function useToast() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const notify = useCallback(
    (message) => {
      if (message?.status === 'SESSION_CHANGED') return;
      dispatch(
        toastShown(
          typeof message === 'string' ? message : errorMessage(message, t)
        )
      );
    },
    [dispatch, t]
  );
  return { notify };
}
