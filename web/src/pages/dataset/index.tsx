import { useFetchKnowledgeBaseConfiguration } from '@/hooks/use-knowledge-request';
import { OwnerTenantIdContext } from '@/pages/agent/context';
import { KnowledgeBaseProvider } from '@/pages/dataset/contexts/knowledge-base-context';

import { Outlet } from 'react-router';
import { DatasetBreadcrumb } from './dataset-breadcrumb';
import { SideBar } from './sidebar';

export default function DatasetWrapper() {
  const { data, loading } = useFetchKnowledgeBaseConfiguration();

  return (
    <OwnerTenantIdContext.Provider value={data?.tenant_id ?? ''}>
      <KnowledgeBaseProvider knowledgeBase={data} loading={loading}>
        <section className="flex size-full min-h-0 min-w-0 flex-col">
          <DatasetBreadcrumb />
          <article className="pt-3 min-h-0 min-w-0 w-full flex-1 grid grid-cols-[auto_1fr] grid-rows-1">
            <SideBar dataset={data} />

            <Outlet />
          </article>
        </section>
      </KnowledgeBaseProvider>
    </OwnerTenantIdContext.Provider>
  );
}
