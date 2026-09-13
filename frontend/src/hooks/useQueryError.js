import { useEffect } from 'react';
import { useToast } from './useToast';

export function useQueryError(error) {
  const { notify } = useToast();
  useEffect(() => {
    if (error) notify(error);
  }, [error, notify]);
}
