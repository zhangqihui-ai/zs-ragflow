import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthPage } from './auth-page';
import { App } from './app';
import { isPublicWorkspaceRoute } from './library-routes';
import './styles.css';
import './form-controls.css';

const path = window.location.pathname.replace(/\/+$/, '');
const authRoute = path === '/login' || path === '/login-next' || path === '/logout';

if (isPublicWorkspaceRoute(path)) {
  void import('./settings/content');
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {authRoute ? <AuthPage logout={path === '/logout'} /> : <App />}
    </StrictMode>,
  );
}
