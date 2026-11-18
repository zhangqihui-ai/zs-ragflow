import { useSearchParams } from 'react-router';
import { standaloneAgentCategory } from '../library-routes';

const kinds = [
  ['knowledge_graph', 'Graph (知识图谱)'],
  ['mind_map', 'Mindmap (思维导图)'],
  ['page_index', 'PageIndex (页面索引)'],
  ['timeline', 'Timeline (时间线)'],
  ['tree', 'Tree (目录树)'],
  ['wiki', 'Wiki (百科)'],
] as const;

export function isStandaloneCompiler(search: URLSearchParams) {
  return standaloneAgentCategory(search.toString()) === 'compilation_template_group';
}

export function compilationKind(search: URLSearchParams) {
  const kind = search.get('operator_kind');
  return isStandaloneCompiler(search) && kinds.some(([value]) => value === kind) ? kind : null;
}

export function CompilationFilter() {
  const [search, setSearch] = useSearchParams();
  const selected = compilationKind(search);

  function selectKind(kind: string | null) {
    const next = new URLSearchParams(search);
    if (kind === null || kind === selected) next.delete('operator_kind');
    else next.set('operator_kind', kind);
    next.set('page', '1');
    setSearch(next);
  }

  return (
    <div className="compilation-filter" role="group" aria-label="编译算子类型">
      <button type="button" aria-pressed={selected === null} onClick={() => selectKind(null)}>
        全部
      </button>
      {kinds.map(([kind, label]) => (
        <button type="button" key={kind} aria-pressed={selected === kind} onClick={() => selectKind(kind)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export async function filterCompilationPage<T>(
  kind: string,
  page: number,
  pageSize: number,
  load: (page: number, size: number) => Promise<{ canvas: T[]; total: number }>,
) {
  const batchSize = 100;
  const matching: T[] = [];
  for (let batch = 1; ; batch += 1) {
    const { canvas, total } = await load(batch, batchSize);
    matching.push(...canvas.filter((item) => {
      const group = item as { templates?: Array<{ kind: string }> };
      return group.templates?.some((template) => template.kind === kind);
    }));
    if (canvas.length < batchSize || batch * batchSize >= total) break;
  }
  const start = (page - 1) * pageSize;
  return { canvas: matching.slice(start, start + pageSize), total: matching.length };
}
