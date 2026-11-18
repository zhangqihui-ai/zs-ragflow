import { useEffect, useState } from 'react';
import { loginUrl, readSession } from './session';
import { WorkspaceFrame } from './settings/workspace-frame';

export function DatasetContentShell({ title, onNavigate, onDatasetTitle }: {
  title: string;
  onNavigate: (path: string) => void;
  onDatasetTitle: (title: { id: string; name: string }) => void;
}) {
  const [token] = useState(readSession);

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

  if (!token) return <main className="dashboard"><p role="status">正在前往登录页…</p></main>;
  const path = location.pathname.replace(/\/+$/, '') + location.search;
  return <WorkspaceFrame initial={path} title={title} onNavigate={onNavigate} onDatasetTitle={onDatasetTitle} trackLoading />;
}
