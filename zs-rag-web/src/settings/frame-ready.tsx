import { useEffect } from 'react';

export function FrameReady() {
  useEffect(() => {
    document.documentElement.dataset.workspaceReady = 'true';
    window.parent.postMessage({ type: 'zs-workspace-ready' }, location.origin);
  }, []);

  return null;
}
