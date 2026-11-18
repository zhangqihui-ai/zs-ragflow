import { useSearchParams } from 'react-router';
import { useFetchUserInfo } from '@/hooks/use-user-setting-request';
import { standaloneAgentCategory } from '../library-routes';

export function isStandalonePipeline(search: URLSearchParams) {
  return standaloneAgentCategory(search.toString()) === 'dataflow_canvas';
}

export function pipelineOwner(search: URLSearchParams) {
  return isStandalonePipeline(search) ? search.get('pipeline_owner') : null;
}

export function PipelineOwnerFilter() {
  return <OwnerFilter param="pipeline_owner" resource="数据管道" />;
}

export function ChatOwnerFilter() {
  return <OwnerFilter param="chat_owner" resource="聊天" />;
}

export function SearchOwnerFilter() {
  return <OwnerFilter param="search_owner" resource="搜索" />;
}

function OwnerFilter({ param, resource }: { param: string; resource: string }) {
  const [search, setSearch] = useSearchParams();
  const { data: { id, nickname, email } } = useFetchUserInfo();
  const name = nickname || email;
  if (!id || !name) return null;

  const selected = search.get(param) === id;
  const label = `${name} 创建的${resource}`;
  return (
    <div className="compilation-filter workspace-owner-filter">
      <button type="button" title={label} aria-pressed={selected} onClick={() => {
        const next = new URLSearchParams(search);
        if (selected) next.delete(param);
        else next.set(param, id);
        next.set('page', '1');
        setSearch(next);
      }}>
        {label}
      </button>
    </div>
  );
}
