export const settingsPages = [
  { id: 'data-source', label: '数据源' },
  { id: 'chat-channel', label: '聊天渠道' },
  { id: 'mcp', label: 'MCP' },
  { id: 'profile', label: '概要' },
  { id: 'api', label: 'API' },
] as const;

export const settingsPath = '/user-setting';
export const defaultSettingsPath = settingsPath + '/data-source';
export const dataSourceDetail = settingsPath + '/data-source/data-source-detail-page';

export const managementPages = [
  { id: 'model', label: '模型管理' },
  { id: 'team', label: '团队' },
] as const;

export function managementPage(path: string) {
  return managementPages.find((page) => path === settingsPath + '/' + page.id);
}

export function settingsPage(path: string) {
  if (path === dataSourceDetail) return settingsPages[0];
  return settingsPages.find((page) => path === settingsPath + '/' + page.id);
}

export function isSettingsRoute(path: string) {
  return path === settingsPath || Boolean(settingsPage(path) || managementPage(path));
}
