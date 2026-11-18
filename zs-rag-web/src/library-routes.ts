export const filesPath = '/files';
export const chatsPath = '/chats';
export const chatDetailPath = '/chat/:id';
export const chatSharePath = '/chats/share';
export const chatWidgetPath = '/chats/widget';
export const searchesPath = '/searches';
export const searchDetailPath = '/search/:id';
export const searchSharePath = '/search/share';
export const agentsPath = '/agents';
const pipelineCategory = 'dataflow_canvas';
const compilerCategory = 'compilation_template_group';
export const pipelinesHref = agentsPath + '?canvas_category=' + pipelineCategory + '&view=standalone';
export const compilationOperatorsHref = agentsPath + '?canvas_category=' + compilerCategory + '&view=standalone';
export const agentListPath = '/agent-list';
export const agentTemplatesPath = '/agent-templates';
export const agentDetailPath = '/agent/:id';
export const agentExplorePath = '/agent/:id/explore';
export const agentLogsPath = '/agent-log-page/:id';
export const agentSharePath = '/agent/share';
export const compilationEditorPath = '/compilation-templates/edit-next';
export const builtinPipelinePath = '/pipeline/:id';
export const dataflowResultPath = '/dataflow-result';

export function isPublicWorkspaceRoute(path: string) {
  return path === chatSharePath || path === chatWidgetPath || path === searchSharePath || path === agentSharePath;
}
export const skillsPath = '/files/skills';
export const memoriesPath = '/memories';
export const memoryMessagesPath = '/memory/memory-message/:id';
export const memorySettingsPath = '/memory/memory-setting/:id';

export function standaloneAgentCategory(search: string) {
  const params = new URLSearchParams(search);
  const category = params.get('canvas_category');
  return params.get('view') === 'standalone' && (category === pipelineCategory || category === compilerCategory)
    ? category : null;
}

export function libraryPage(path: string, search = ''): { href: string; label: string; title?: string; detail?: string } | undefined {
  if ([agentsPath, agentListPath, agentTemplatesPath, dataflowResultPath, compilationEditorPath].includes(path)
    || path.startsWith(compilationEditorPath + '/')
    || (path !== agentSharePath && /^\/agent\/[^/]+(?:\/explore)?$/.test(path))
    || /^\/(agent-log-page|pipeline)\/[^/]+$/.test(path)) {
    const detail = path === agentTemplatesPath ? '模板'
      : path.startsWith(compilationEditorPath) ? '编译模板'
      : path.startsWith('/agent-log-page/') ? '运行日志'
      : path === dataflowResultPath ? '运行结果'
      : path.startsWith('/pipeline/') ? '内置管道'
      : path.endsWith('/explore') ? '探索'
      : path === agentsPath || path === agentListPath ? undefined : '工作流';
    const params = new URLSearchParams(search);
    const category = params.get('canvas_category') ?? params.get('category');
    if ((path === agentsPath || path === agentListPath) && !standaloneAgentCategory(search)) {
      const title = category === pipelineCategory ? '数据管道'
        : category === compilerCategory ? '编译算子' : '智能体';
      return { href: agentsPath, label: '智能体', title };
    }
    if (category === compilerCategory || path.startsWith(compilationEditorPath)) {
      return { href: compilationOperatorsHref, label: '编译算子', detail };
    }
    if (category === pipelineCategory || path.startsWith('/pipeline/') || path === dataflowResultPath) {
      return { href: pipelinesHref, label: '数据管道', detail };
    }
    return { href: agentsPath, label: '智能体', detail };
  }
  if (path === searchesPath || (path !== searchSharePath && /^\/search\/[^/]+$/.test(path))) {
    return { href: searchesPath, label: '搜索' };
  }
  if (path === chatsPath || /^\/chat\/[^/]+$/.test(path)) return { href: chatsPath, label: '聊天' };
  if (path === filesPath || path === skillsPath) return { href: filesPath, label: '文件管理' };
  if (path === memoriesPath || /^\/memory\/memory-(message|setting)\/[^/]+$/.test(path)) {
    return { href: memoriesPath, label: '记忆' };
  }
}
