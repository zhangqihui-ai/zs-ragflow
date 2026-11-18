import { useFetchArtifactTopicList, useFetchDatasetStructureGraph } from '@/hooks/use-knowledge-request';
import { useFetchDatasetNav } from '@/hooks/use-dataset-nav-request';
import { useEffect } from 'react';
import { useParams } from 'react-router';

const labels: Record<string, string> = {
  'llm-wiki': 'Wiki (维基)',
  tree: 'Tree/PageIndex (树 / 页面索引)',
  graph: 'Graph (知识图谱)',
  mindmap: 'Mindmap (思维导图)',
  timeline: 'Timeline (时间线)',
};

export function artifactTypeLabel(mode: string) {
  return labels[mode];
}

function useStructureExists(kind: string) {
  const { data } = useFetchDatasetStructureGraph(kind);
  return (data?.total_entities ?? 0) > 0 || Boolean(data?.templates?.some(
    (template) => template.entities?.length || template.relations?.length,
  ));
}

export function ArtifactTypes({ value, onChange }: { value: string; onChange: (mode: string) => void }) {
  const { id } = useParams();
  useEffect(() => {
    window.parent.postMessage({ type: 'zs-artifact-view', id, mode: value }, location.origin);
    return () => window.parent.postMessage({ type: 'zs-artifact-view', id, mode: null }, location.origin);
  }, [id, value]);
  const { topics } = useFetchArtifactTopicList();
  const { data: tree } = useFetchDatasetNav();
  const graph = useStructureExists('graph');
  const mindmap = useStructureExists('mindmap');
  const timeline = useStructureExists('timeline');
  const available = [
    ['llm-wiki', topics.length > 0],
    ['tree', (tree?.total ?? 0) > 0],
    ['graph', graph],
    ['mindmap', mindmap],
    ['timeline', timeline],
  ] as const;

  return (
    <ul className="artifact-types" aria-label="已生成的产物类型">
      {available.filter(([, exists]) => exists).map(([mode]) => (
        <li key={mode}>
          <button type="button" aria-pressed={value === mode} onClick={() => onChange(mode)}>
            {labels[mode]}
          </button>
        </li>
      ))}
    </ul>
  );
}
