import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signedIn, signedOut } from '../store/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const signIn = useCallback(
    (session) => dispatch(signedIn(session)),
    [dispatch]
  );
  const signOut = useCallback(() => dispatch(signedOut()), [dispatch]);
  return { user, isAuthenticated: Boolean(user && token), signIn, signOut };
}
