import { useRoutes } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store } from '@/store';
import Toast from '@/components/Toast';
import routes from '@/routes';

function AppRoutes() {
  return useRoutes(routes);
}

function App() {
  return (
    <Provider store={store}>
      <SessionRoutes />
      <Toast />
    </Provider>
  );
}

function SessionRoutes() {
  const version = useSelector((state) => state.auth.version);
  return <AppRoutes key={version} />;
}

export default App;
