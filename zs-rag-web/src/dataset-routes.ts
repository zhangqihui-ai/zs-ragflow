export const datasetFilesPath = '/dataset/files/:id';
export const originalDatasetFilesPath = '/dataset//files/:id';
export const datasetConfigPath = '/dataset/configuration/:id';
export const parsedChunksPath = '/chunk/parsed/chunks';
export const datasetSections = [
  { segment: 'files', label: '文档' },
  { segment: 'configuration', label: '配置' },
  { segment: 'retrieval', label: '检索测试' },
  { segment: 'logs', label: '日志' },
  { segment: 'compilation', label: '知识产物' },
] as const;

export function datasetFiles(id: string) {
  return '/dataset/files/' + encodeURIComponent(id);
}

export function isDatasetLayoutRoute(path: string) {
  return /^\/dataset\/\/?files\/[^/]+$/.test(path)
    || /^\/dataset\/(configuration|retrieval|logs|compilation|knowledge-graph)\/[^/]+$/.test(path);
}

export function isDatasetContentRoute(path: string) {
  return isDatasetLayoutRoute(path)
    || path === parsedChunksPath
    || /^\/chunk\/(chunk|result)\/[^/]+$/.test(path)
    || /^\/document\/[^/]+$/.test(path);
}
