import { Database, MessagesSquare, Plug, Unplug, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, loginUrl, readSession } from '../session';
import { defaultSettingsPath, managementPage, settingsPage, settingsPages, settingsPath } from './routes';
import { WorkspaceFrame } from './workspace-frame';

const icons = { 'data-source': Database, 'chat-channel': MessagesSquare, mcp: Plug, profile: User, api: Unplug };

export function SettingsShell() {
  const [initial] = useState(() => {
    const path = location.pathname.replace(/\/+$/, '');
    return (settingsPage(path) || managementPage(path) ? path : defaultSettingsPath) + location.search;
  });
  const [current, setCurrent] = useState(initial.split('?')[0]);
  const handleNavigate = useCallback((path: string) => setCurrent(path.split('?')[0]), []);
  const [token] = useState(readSession);
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (!token) {
      location.replace(loginUrl());
      return;
    }
    const syncSession = () => {
      if (readSession() !== token) location.reload();
    };
    window.addEventListener('focus', syncSession);
    return () => window.removeEventListener('focus', syncSession);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    api<{ version: string }>('/api/v1/system/version', { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setVersion(data.version); })
      .catch(() => { /* Version display is independent of the settings pages. */ });
    return () => controller.abort();
  }, [token]);

  if (!token) return <main className="dashboard"><p role="status">正在前往登录页…</p></main>;

  const selected = settingsPage(current);
  const management = managementPage(current);
  return (
    <main className={management ? 'management-shell' : 'settings-shell'}>
      {!management && <nav className="settings-nav" aria-label="账户设置导航">
        {settingsPages.map((page) => {
          const Icon = icons[page.id];
          return <a key={page.id} className="nav-link" href={settingsPath + '/' + page.id}
            aria-current={selected?.id === page.id ? 'page' : undefined}>
            <Icon size={16} /><span>{page.label}</span>
          </a>;
        })}
        {version && <small className="settings-version">{version}</small>}
      </nav>}
      <WorkspaceFrame initial={initial} title={management?.label ?? selected?.label ?? '账户设置'} onNavigate={handleNavigate} />
    </main>
  );
}
