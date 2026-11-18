import type { Dataset } from './dashboard-data';
import { api, apiEnvelope } from './session';

export type DatasetRow = Dataset & {
  parser_id?: string;
  pipeline_id?: string;
  embedding_model?: string;
  embedding_model_name?: string;
  operator_permission?: number;
  update_date?: string;
  parsing_summary?: { total: number; completed: number; running: number; failed: number; pending: number; status: string };
};

export type DatasetOwner = { id: string; label: string; count: number };
export type BuiltinParser = { id: string; title: string };
export type Pipeline = {
  id: string;
  name: string;
  avatar?: string;
  compilation_kind?: string;
  versions: { id: string; name: string; alias: string }[];
};
type Model = { model_id?: string; name: string; provider_name: string; instance_name: string; model_type: string[] };
type DefaultModel = { model_id?: string; model_name: string; model_instance: string; model_provider: string; model_type: string; enable: boolean };

const datasets = '/api/v1/datasets';
export const builtinParsers = '/api/v1/pipelines?type=builtin';
export const pipelines = '/api/v1/agents/versions?category=dataflow';

export function listDatasets(query: URLSearchParams, token: string, signal: AbortSignal) {
  return apiEnvelope<DatasetRow[]>(datasets + '?' + query, { signal }, token);
}

export async function listOwners(token: string, signal: AbortSignal) {
  return (await api<{ filter: { owner: DatasetOwner[] | null } }>(datasets + '?type=filter', { signal }, token)).filter.owner ?? [];
}

export async function embeddingOptions(token: string, signal: AbortSignal) {
  const [models, defaults] = await Promise.all([
    api<Model[]>('/api/v1/models', { signal }, token),
    api<{ models: DefaultModel[] }>('/api/v1/models/default', { signal }, token).catch(() => null),
  ]);
  const byId = new Map<string, { id: string; alias: string; label: string }>();
  for (const model of models ?? []) {
    if (!model.model_type?.includes('embedding')) continue;
    const name = model.name.split('__')[0];
    const alias = [name, model.instance_name, model.provider_name].join('@');
    const id = model.model_id || alias;
    byId.set(id, { id, alias, label: [name, model.instance_name, model.provider_name].filter(Boolean).join(' · ') });
  }
  const options = [...byId.values()];
  const active = (defaults?.models ?? []).find((model) => model.model_type === 'embedding' && model.enable);
  const fallback = active && [active.model_name, active.model_instance, active.model_provider].join('@');
  const defaultId = options.find((option) => option.id === active?.model_id || option.alias === fallback)?.id ?? '';
  return { options, defaultId };
}

export type CreateDataset = { name: string; embedding_model: string } & (
  | { parse_type: 1; parser_id: string }
  | { parse_type: 2; pipeline_id: string; pipeline_version_id: string }
);

export function createDataset(data: CreateDataset, token: string) {
  return api<{ id: string }>(datasets, { method: 'POST', body: JSON.stringify({ ...data, language: 'Chinese' }) }, token);
}

export function renameDataset(id: string, name: string, token: string) {
  return api(datasets + '/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ name }) }, token);
}

export function deleteDataset(id: string, token: string) {
  return api(datasets, { method: 'DELETE', body: JSON.stringify({ ids: [id] }) }, token);
}
