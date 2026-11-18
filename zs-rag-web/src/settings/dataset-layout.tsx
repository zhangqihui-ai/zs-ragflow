import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router';
import { useFetchKnowledgeBaseConfiguration } from '@/hooks/use-knowledge-request';
import { OwnerTenantIdContext } from '@/pages/agent/context';
import { KnowledgeBaseProvider } from '@/pages/dataset/contexts/knowledge-base-context';
import { datasetSections } from '../dataset-routes';
import { FrameReady } from './frame-ready';

export function DatasetLayout() {
  const { id = '' } = useParams();
  const { pathname } = useLocation();
  const { data, loading } = useFetchKnowledgeBaseConfiguration();
  const encoded = encodeURIComponent(id);
  useEffect(() => {
    if (data?.id) window.parent.postMessage({ type: 'zs-dataset-title', id, name: data.name }, location.origin);
  }, [data?.id, data?.name, id]);

  return (
    <div className="knowledge-detail">
      <FrameReady />
      <nav aria-label="知识库详情导航" className="knowledge-detail-tabs">
        {datasetSections.map(({ segment, label }) => (
          <Link key={segment} to={`/dataset/${segment}/${encoded}`}
            aria-current={
              pathname === `/dataset/${segment}/${encoded}`
              || (segment === 'files' && pathname.startsWith('/dataset//files/'))
              || (segment === 'compilation' && pathname.startsWith('/dataset/knowledge-graph/'))
                ? 'page' : undefined
            }>
            {label}
          </Link>
        ))}
      </nav>
      {!data?.id ? (!loading && (
        <p className="settings-loading" role="alert">无法打开此知识库，请检查访问权限或刷新重试。</p>
      )) : (
        <OwnerTenantIdContext.Provider value={data.tenant_id ?? ''}>
          <KnowledgeBaseProvider knowledgeBase={data} loading={loading}>
            <div className="knowledge-detail-body">
              <Suspense fallback={null}><Outlet /></Suspense>
            </div>
          </KnowledgeBaseProvider>
        </OwnerTenantIdContext.Provider>
      )}
    </div>
  );
}
