import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { isDatasetContentRoute } from '../dataset-routes';
import { libraryPage } from '../library-routes';
import { isSettingsRoute } from './routes';

export function isWorkspaceRoute(path: string) {
  return isSettingsRoute(path) || isDatasetContentRoute(path) || Boolean(libraryPage(path));
}

export function WorkspaceFrame({ initial, title, onNavigate, onDatasetTitle, trackLoading = false }: {
  initial: string;
  title: string;
  onNavigate?: (path: string) => void;
  onDatasetTitle?: (title: { id: string; name: string }) => void;
  trackLoading?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const readyObserver = useRef<MutationObserver>();
  const [source, setSource] = useState({ path: initial, revision: 0 });
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => () => readyObserver.current?.disconnect(), []);

  useEffect(() => {
    if (!trackLoading || ready) return;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, [trackLoading, ready, source.revision]);

  function loadFrame(path: string) {
    readyObserver.current?.disconnect();
    setReady(false);
    setTimedOut(false);
    setSource((previous) => ({ path, revision: previous.revision + 1 }));
  }

  useLayoutEffect(() => {
    function onRoute(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      const { type, path, id, name } = event.data ?? {};
      if (type === 'zs-dataset-title' && typeof id === 'string' && typeof name === 'string') {
        onDatasetTitle?.({ id, name });
        return;
      }
      if (type === 'zs-workspace-ready') {
        setReady(true);
        return;
      }
      if (type !== 'zs-workspace-route' || typeof path !== 'string') return;
      const pathname = path.split('?')[0];
      if (!isWorkspaceRoute(pathname)) return;
      if (location.pathname + location.search !== path) history.pushState(null, '', path);
      onNavigate?.(path);
    }

    function onBack() {
      if (location.pathname === '/datasets' || location.pathname === '/') return;
      if (!isWorkspaceRoute(location.pathname)) {
        location.reload();
        return;
      }
      onNavigate?.(location.pathname + location.search);
      loadFrame(location.pathname + location.search);
    }

    window.addEventListener('message', onRoute);
    window.addEventListener('popstate', onBack);
    if (frame.current?.contentDocument?.documentElement?.dataset.workspaceReady === 'true') {
      setReady(true);
    }
    return () => {
      window.removeEventListener('message', onRoute);
      window.removeEventListener('popstate', onBack);
    };
  }, [onNavigate, onDatasetTitle]);

  const params = new URLSearchParams({ path: source.path });
  if (source.revision) params.set('reload', String(source.revision));
  const content = <iframe key={source.revision} ref={frame} className="settings-frame" title={title}
    onLoad={(event) => {
      if (!trackLoading) return;
      readyObserver.current?.disconnect();
      const root = event.currentTarget.contentDocument?.documentElement;
      if (!root) return;
      if (root.dataset.workspaceReady === 'true') {
        setReady(true);
        return;
      }
      const observer = new MutationObserver(() => {
        if (root.dataset.workspaceReady !== 'true') return;
        observer.disconnect();
        setReady(true);
      });
      observer.observe(root, { attributeFilter: ['data-workspace-ready'] });
      readyObserver.current = observer;
    }}
    src={'/settings-content.html?' + params} />;
  if (!trackLoading) return content;

  return (
    <>
      {!ready && timedOut && (
        <p className="workspace-frame-status" role="alert">
          页面加载超时。 <button type="button" className="button" onClick={() => loadFrame(location.pathname + location.search)}>重试</button>
        </p>
      )}
      <main className="workspace-frame-container">{content}</main>
    </>
  );
}
