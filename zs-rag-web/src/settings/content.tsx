import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import 'dayjs/locale/tr';
import 'dayjs/locale/uz';
import 'dayjs/locale/zh-cn';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';
import weekday from 'dayjs/plugin/weekday';
import { Component, lazy, Suspense, useEffect, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router';
import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeEnum } from '@/constants/common';
import { initLanguage } from '@/locales/config';
import { fetchBillingStatus } from '@/ee/services/billingStatus';
import { useFetchKnowledgeBaseConfiguration } from '@/hooks/use-knowledge-request';
import { dataSourceDetail, defaultSettingsPath, isSettingsRoute, settingsPath } from './routes';
import { datasetConfigPath, datasetFilesPath, isDatasetContentRoute, originalDatasetFilesPath, parsedChunksPath } from '../dataset-routes';
import { FrameReady } from './frame-ready';
import { isStandaloneCompiler } from './compilation-filter';
import { chatDetailPath, chatSharePath, chatsPath, chatWidgetPath, isPublicWorkspaceRoute, searchDetailPath, searchesPath, searchSharePath } from '../library-routes';
import { filesPath, libraryPage, memoriesPath, memoryMessagesPath, memorySettingsPath, skillsPath } from '../library-routes';
import { agentDetailPath, agentExplorePath, agentListPath, agentLogsPath, agentsPath, agentSharePath, agentTemplatesPath, builtinPipelinePath, compilationEditorPath, dataflowResultPath, standaloneAgentCategory } from '../library-routes';
import { loginUrl, readSession } from '../session';
import '@legacy/tailwind.css';
import '@/global.less';
import './settings-theme.css';
import '../form-controls.css';

const Model = lazy(() => import('@/pages/user-setting/setting-model'));
const Chats = lazy(() => import('@/pages/next-chats'));
const Chat = lazy(() => import('@/pages/next-chats/chat'));
const ChatShare = lazy(() => import('@/pages/next-chats/share'));
const ChatWidget = lazy(() => import('@/pages/next-chats/widget'));
const Searches = lazy(() => import('@/pages/next-searches'));
const SearchDetail = lazy(() => import('@/pages/next-search'));
const SearchShare = lazy(() => import('@/pages/next-search/share'));
const Agents = lazy(() => import('@/pages/agents'));
const Agent = lazy(() => import('@/pages/agent'));
const AgentExplore = lazy(() => import('@/pages/agent/explore'));
const AgentTemplates = lazy(() => import('@/pages/agents/agent-templates'));
const AgentLogs = lazy(() => import('@/pages/agents/agent-log-page'));
const AgentShare = lazy(() => import('@/pages/agent/share'));

function AgentsView() {
  const { search } = useLocation();
  const compiler = isStandaloneCompiler(new URLSearchParams(search));
  return (
    <div className={compiler ? 'library-page compilation-list' : 'library-page'} data-agent-standalone={Boolean(standaloneAgentCategory(search))}>
      <Agents />
    </div>
  );
}
const CompilationEditor = lazy(() => import('@/pages/user-setting/compilation-templates/edit-next'));
const BuiltinPipeline = lazy(() => import('@/pages/builtin-pipeline'));
const DataflowResult = lazy(() => import('@/pages/dataflow-result'));
const Files = lazy(() => import('@/pages/files'));
const Skills = lazy(() => import('@/pages/skills'));
const Memories = lazy(() => import('@/pages/memories'));
const Memory = lazy(() => import('@/pages/memory'));
const MemoryMessages = lazy(() => import('@/pages/memory/memory-message'));
const MemorySettings = lazy(() => import('@/pages/memory/memory-setting'));
const DataSource = lazy(() => import('@/pages/user-setting/data-source'));
const DataSourceDetail = lazy(() => import('@/pages/user-setting/data-source/data-source-detail-page'));
const ChatChannel = lazy(() => import('@/pages/user-setting/chat-channel'));
const Mcp = lazy(() => import('@/pages/user-setting/mcp'));
const Team = lazy(() => import('@/pages/user-setting/setting-team'));
const Profile = lazy(() => import('@/pages/user-setting/profile'));
const Api = lazy(() => import('@/pages/user-setting/setting-api'));
const DatasetLayout = lazy(() => import('./dataset-layout').then((module) => ({ default: module.DatasetLayout })));
const DatasetDocuments = lazy(() => import('@/pages/dataset/dataset'));
const DatasetConfiguration = lazy(() => import('@/pages/dataset/setting'));
const DatasetRetrieval = lazy(() => import('@/pages/dataset/testing'));
const DatasetLogs = lazy(() => import('@/pages/dataset/dataset-overview'));
const DatasetArtifacts = lazy(() => import('@/pages/dataset/compilation'));
const DatasetGraph = lazy(() => import('@/pages/dataset/knowledge-graph'));

function DatasetArtifactsView({ originalGraph = false }: { originalGraph?: boolean }) {
  const { id = '' } = useParams();
  return (
    <div className="dataset-artifacts dataset-artifacts-view">
      {originalGraph && <div className="dataset-artifacts-tools">
        <Link to={`/dataset/compilation/${encodeURIComponent(id)}`}>
          返回 Artifacts
        </Link>
      </div>}
      <div className={originalGraph ? 'dataset-original-graph' : 'dataset-artifacts'}>
        {originalGraph ? <DatasetGraph /> : <DatasetArtifacts />}
      </div>
      <FrameReady />
    </div>
  );
}
const ParsedChunks = lazy(() => import('@/pages/chunk/parsed-result/add-knowledge/components/knowledge-chunk'));
const ChunkResult = lazy(() => import('@/pages/chunk/chunk-result'));
const ResultView = lazy(() => import('@/pages/chunk/result-view'));
const DocumentViewer = lazy(() => import('@/pages/document-viewer'));

function ParsedChunksView() {
  const { data: { id, name } } = useFetchKnowledgeBaseConfiguration();
  useEffect(() => {
    if (id) window.parent.postMessage({ type: 'zs-dataset-title', id, name }, location.origin);
  }, [id, name]);
  return <div className="knowledge-parser"><ParsedChunks /></div>;
}

dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);
dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);

const publicWorkspace = isPublicWorkspaceRoute(location.pathname.replace(/\/+$/, ''));
const requested = publicWorkspace ? location.pathname + location.search : new URLSearchParams(location.search).get('path') ?? '';
const path = requested.split('?')[0];
const initialPath = publicWorkspace || (isSettingsRoute(path) && path !== settingsPath) || isDatasetContentRoute(path) || libraryPage(path) ? requested : defaultSettingsPath;

const client = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 2 } } });

function SyncShell() {
  const { setTheme } = useTheme();
  const route = useLocation();

  useEffect(() => {
    const root = window.parent.document.documentElement;
    const apply = () => setTheme(root.dataset.theme === 'dark' ? ThemeEnum.Dark : ThemeEnum.Light, false);
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [setTheme]);

  useEffect(() => {
    if (isSettingsRoute(route.pathname) || isDatasetContentRoute(route.pathname) || libraryPage(route.pathname)) {
      window.parent.postMessage({ type: 'zs-workspace-route', path: route.pathname + route.search }, location.origin);
    }
  }, [route.pathname, route.search]);

  return null;
}

function NonDatasetLayoutReady() {
  const { pathname } = useLocation();
  return pathname.startsWith('/dataset/') ? null : <FrameReady />;
}

function FrameError() {
  return <><p className="settings-loading" role="alert">加载页面失败。<button onClick={() => location.reload()}>重试</button></p><FrameReady /></>;
}

class FrameErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <FrameError /> : this.props.children;
  }
}

if (!publicWorkspace && !readSession()) {
  window.parent.location.replace(loginUrl(false, window.parent.location));
} else {
  const root = createRoot(document.getElementById('root')!);
  void initLanguage().then(() => publicWorkspace ? undefined : fetchBillingStatus()).then(() => {
    root.render(
      <TooltipProvider>
        <QueryClientProvider client={client}>
          <ThemeProvider storageKey="zs-rag-settings-theme">
            <MemoryRouter initialEntries={path === dataSourceDetail ? [settingsPath + '/data-source', initialPath] : [initialPath]}>
              {!publicWorkspace && <SyncShell />}
              <FrameErrorBoundary>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path={agentsPath} element={<AgentsView />} />
                    <Route path={agentListPath} element={<AgentsView />} />
                    <Route path={agentDetailPath} element={<div className="library-page agent-workspace"><Agent /></div>} />
                    <Route path={agentExplorePath} element={<div className="library-page"><AgentExplore /></div>} />
                    <Route path={agentTemplatesPath} element={<div className="library-page"><AgentTemplates /></div>} />
                    <Route path={agentLogsPath} element={<div className="library-page"><AgentLogs /></div>} />
                    <Route path={compilationEditorPath + '/:id?'} element={<div className="library-page"><CompilationEditor /></div>} />
                    <Route path={builtinPipelinePath} element={<div className="library-page"><BuiltinPipeline /></div>} />
                    <Route path={dataflowResultPath} element={<div className="library-page"><DataflowResult /></div>} />
                    {publicWorkspace && <Route path={agentSharePath} element={<AgentShare />} />}
                    <Route path={chatsPath} element={<div className="library-page"><Chats /></div>} />
                    <Route path={chatDetailPath} element={<div className="library-page chat-workspace"><Chat /></div>} />
                    <Route path={searchesPath} element={<div className="library-page"><Searches /></div>} />
                    <Route path={searchDetailPath} element={<div className="library-page search-workspace"><SearchDetail /></div>} />
                    {publicWorkspace && <Route path={searchSharePath} element={<SearchShare />} />}
                    {publicWorkspace && <Route path={chatSharePath} element={<ChatShare />} />}
                    {publicWorkspace && <Route path={chatWidgetPath} element={<ChatWidget />} />}
                    <Route path={filesPath} element={<div className="library-page"><Files /></div>} />
                    <Route path={skillsPath} element={<div className="library-page"><Skills /></div>} />
                    <Route path={memoriesPath} element={<div className="library-page"><Memories /></div>} />
                    <Route element={<div className="library-page memory-detail"><Memory /></div>}>
                      <Route path={memoryMessagesPath} element={<MemoryMessages />} />
                      <Route path={memorySettingsPath} element={<MemorySettings />} />
                    </Route>
                    <Route path={settingsPath + '/model'} element={<div className="settings-model-content h-full"><Model /></div>} />
                    <Route path={settingsPath + '/data-source'} element={<DataSource />} />
                    <Route path={dataSourceDetail} element={<DataSourceDetail />} />
                    <Route path={settingsPath + '/chat-channel'} element={<ChatChannel />} />
                    <Route path={settingsPath + '/mcp'} element={<div className="settings-mcp-content h-full"><Mcp /></div>} />
                    <Route path={settingsPath + '/team'} element={<Team />} />
                    <Route path={settingsPath + '/profile'} element={<div className="settings-profile-content h-full"><Profile /></div>} />
                    <Route path={settingsPath + '/api'} element={<Api />} />
                    <Route element={<DatasetLayout />}>
                      <Route path={datasetFilesPath} element={<DatasetDocuments />} />
                      <Route path={originalDatasetFilesPath} element={<DatasetDocuments />} />
                      <Route path={datasetConfigPath} element={<><div className="dataset-configuration"><DatasetConfiguration /></div><FrameReady /></>} />
                      <Route path="/dataset/retrieval/:id" element={<><div className="dataset-retrieval"><DatasetRetrieval /></div><FrameReady /></>} />
                      <Route path="/dataset/logs/:id" element={<><DatasetLogs /><FrameReady /></>} />
                      <Route path="/dataset/compilation/:id" element={<DatasetArtifactsView />} />
                      <Route path="/dataset/knowledge-graph/:id" element={<DatasetArtifactsView originalGraph />} />
                    </Route>
                    <Route path={parsedChunksPath} element={<ParsedChunksView />} />
                    <Route path="/chunk/chunk/:id" element={<ChunkResult />} />
                    <Route path="/chunk/result/:id" element={<ResultView />} />
                    <Route path="/document/:id" element={<DocumentViewer />} />
                  </Routes>
                  {!publicWorkspace && <NonDatasetLayoutReady />}
                </Suspense>
              </FrameErrorBoundary>
              <Sonner position="top-right" expand closeButton />
              <Toaster />
            </MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </TooltipProvider>,
    );
  }).catch(() => {
    root.render(<FrameError />);
  });
}
