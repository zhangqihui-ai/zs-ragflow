import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Bot, Box, Brain, Info,
  FileText, FolderOpen, LayoutDashboard, MessageCircle,
  MessagesSquare, PanelLeft, RefreshCw, Search, Settings, Shapes, LogOut, Users, Workflow,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { DashboardContent } from './dashboard';
import { legacyUrl } from './legacy-url';
import { DatasetContentShell } from './dataset-content-shell';
import { agentListPath, agentsPath, chatsPath, compilationOperatorsHref, filesPath, libraryPage, memoriesPath, pipelinesHref, searchesPath, skillsPath } from './library-routes';
import { datasetFiles, isDatasetContentRoute, isDatasetLayoutRoute, parsedChunksPath } from './dataset-routes';
import { DatasetsPage } from './datasets-page';
import { SettingsShell } from './settings/shell';
import { defaultSettingsPath, isSettingsRoute, managementPage, managementPages, settingsPath } from './settings/routes';
import { ThemeControl } from './theme-control';
import { periods, useDashboard, type Period } from './dashboard-data';
import { api, readSession } from './session';

const home = { label: '工作台', icon: LayoutDashboard, href: '/' };
const datasets = { label: '知识库', icon: BookOpen, href: '/datasets' };
const settings = { label: '账户设置', icon: Settings, href: defaultSettingsPath };
const groups = [
  { label: '知识空间', items: [
    datasets,
    { label: '数据管道', icon: Workflow, href: pipelinesHref },
    { label: '编译算子', icon: Shapes, href: compilationOperatorsHref },
    { label: '文件管理', icon: FolderOpen, href: filesPath },
  ] },
  { label: '智能应用', items: [
    { label: '聊天', icon: MessagesSquare, href: chatsPath },
    { label: '搜索', icon: Search, href: searchesPath },
    { label: '智能体', icon: Bot, href: agentsPath },
    { label: '记忆', icon: Brain, href: memoriesPath },
  ] },
  { label: '管理', items: managementPages.map(({ id, label }) => ({
    label, icon: id === 'model' ? Box : Users, href: settingsPath + '/' + id,
  })) },
];

type Destination = { label: string; icon: typeof BookOpen; href: string };

function NavLink({ item, children, active }: { item: Destination; children?: ReactNode; active?: boolean }) {
  const Icon = item.icon;
  return (
    <a className="nav-link" href={item.href} aria-current={active ? 'page' : undefined}>
      <Icon size={16} />
      <span>{item.label}</span>
      {children}
    </a>
  );
}

type AccountProfile = { id?: string; nickname?: string; email?: string; avatar?: string; is_superuser?: boolean };

function SidebarAccount({ hasSession, settingsActive }: { hasSession: boolean; settingsActive: boolean }) {
  const [profile, setProfile] = useState<AccountProfile>();

  useEffect(() => {
    const token = hasSession ? readSession() : undefined;
    if (!token) {
      setProfile(undefined);
      return;
    }
    const controller = new AbortController();
    api<AccountProfile>('/api/v1/users/me', { signal: controller.signal }, token).then((user) => {
      if (!controller.signal.aborted) setProfile(user);
    }).catch(() => {});
    return () => controller.abort();
  }, [hasSession]);

  const name = profile?.nickname?.trim() || profile?.email?.trim() || '当前用户';
  const role = profile?.id ? profile.is_superuser ? '管理员' : '普通用户' : '—';
  return (
    <div className="sidebar-footer">
      <NavLink item={{ ...settings, label: '设置' }} active={settingsActive} />
      <div className="sidebar-account-row">
        <a className="account" href={hasSession ? settingsPath + '/profile' : '/login-next'}>
          <span className="account-avatar" aria-hidden="true">
            {profile ? Array.from(name)[0]?.toUpperCase() : 'ZS'}
            {profile?.avatar && <img key={profile.avatar} src={profile.avatar} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
          </span>
          {hasSession ? <span className="account-info">
            <span title={name}>{name}</span>
            <span className="account-role">{role}</span>
          </span> : <span>登录工作区</span>}
        </a>
        {hasSession && <a className="icon-button" href="/logout" title="退出登录" aria-label="退出登录"><LogOut size={15} /></a>}
        <a className="icon-button" href={legacyUrl('/')} title="打开原版" aria-label="打开原版"><ArrowUpRight size={15} /></a>
      </div>
    </div>
  );
}

function SearchDialog({ dialogRef, datasets, navigate }: {
  dialogRef: RefObject<HTMLDialogElement>;
  datasets: Destination[];
  navigate: (href: string) => void;
}) {
  const [query, setQuery] = useState('');
  const startedOnBackdrop = useRef(false);
  const term = query.trim().toLowerCase();
  const results = [home, ...groups.flatMap((group) => group.items), settings, ...datasets]
    .filter((item) => item.label.toLowerCase().includes(term));

  function isBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return false;
    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
    return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom;
  }

  return (
    <dialog ref={dialogRef} className="search-dialog" aria-label="快速搜索" onClose={() => setQuery('')}
      onPointerDown={(event) => { startedOnBackdrop.current = isBackdrop(event); }}
      onClick={(event) => {
        if (startedOnBackdrop.current && isBackdrop(event)) event.currentTarget.close();
        startedOnBackdrop.current = false;
      }}>
      <form className="search-input" onSubmit={(event) => {
        event.preventDefault();
        if (results[0]) navigate(results[0].href);
      }}>
        <label className="form-field search-field">
          <Search size={16} />
          <input aria-label="搜索页面与最近知识库" placeholder="搜索页面与最近知识库…" value={query}
            onChange={(event) => setQuery(event.target.value)} autoFocus />
        </label>
        <button className="key" type="button" aria-label="关闭搜索" onClick={() => dialogRef.current?.close()}>Esc</button>
      </form>
      <nav className="search-results" aria-label="搜索结果">
        {results.length ? results.map((item) => (
          <NavLink key={item.href} item={item}><ArrowRight size={14} className="result-arrow" /></NavLink>
        )) : <p className="empty-text" role="status">没有匹配的结果</p>}
      </nav>
    </dialog>
  );
}

export function App() {
  const [route, setRoute] = useState(() => location.pathname + location.search);
  const pathname = route.split('?', 1)[0];
  const search = route.slice(pathname.length);
  const [datasetFrameRevision, setDatasetFrameRevision] = useState(0);
  const [keepList, setKeepList] = useState(() => location.pathname.replace(/\/+$/, '') === '/datasets');
  const [datasetTitle, setDatasetTitle] = useState<{ id: string; name: string }>();
  const [artifactView, setArtifactView] = useState<{ id: string; mode: string | null }>();
  const path = pathname.replace(/\/+$/, '');
  const isSettingsPage = isSettingsRoute(path);
  const management = managementPage(path);
  const isDatasetDetail = isDatasetContentRoute(path);
  const library = libraryPage(path, search);
  const isDatasetsPage = path === '/datasets';
  const isParsedChunks = path === parsedChunksPath;
  const chunkDatasetId = isParsedChunks ? new URLSearchParams(search).get('id') : null;
  const showDatasetBreadcrumb = isDatasetLayoutRoute(path) || !!chunkDatasetId;
  const datasetIdSegment = chunkDatasetId ? encodeURIComponent(chunkDatasetId) : path.slice(path.lastIndexOf('/') + 1);
  const datasetHome = '/dataset/files/' + datasetIdSegment;
  const datasetName = datasetTitle && datasetIdSegment === encodeURIComponent(datasetTitle.id)
    ? datasetTitle.name || '详情'
    : '详情';
  const section = isDatasetsPage || isDatasetDetail ? datasets
    : management ? { href: path, label: management.label }
    : isSettingsPage ? settings
    : library;
  const libraryDetail = library && (library.detail || (path !== agentsPath && path !== agentListPath && path !== library.href
    ? library.href === chatsPath ? '会话'
      : library.href === searchesPath ? '检索'
      : path === skillsPath ? '技能'
      : path.startsWith('/memory/memory-setting/') ? '配置' : '消息'
    : undefined));
  const [period, setPeriod] = useState<Period>('7d');
  const [navOpen, setNavOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const { data, refresh, hasSession } = useDashboard(period, !isDatasetsPage && !isSettingsPage && !isDatasetDetail && !library);
  const loggedIn = data.status === 'live';
  const hasData = data.status === 'live' || data.status === 'demo';

  function navigate(href: string) {
    const next = new URL(href, location.origin);
    if (next.origin !== location.origin || !isDatasetContentRoute(next.pathname)) {
      window.location.assign(href);
      return;
    }

    const destination = next.pathname + next.search;
    if (destination !== location.pathname + location.search) {
      history.pushState({ datasetListPath: isDatasetsPage ? location.pathname + location.search : null }, '', destination);
      setDatasetFrameRevision((revision) => revision + 1);
    }
    dialog.current?.close();
    setNavOpen(false);
    setRoute(destination);
  }

  function followDatasetLink(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.origin !== location.origin || anchor.target) return;
    if (isDatasetDetail && anchor.pathname === '/datasets' && !anchor.search) {
      event.preventDefault();
      returnToDatasetList();
      return;
    }
    if (!isDatasetContentRoute(anchor.pathname)) return;
    event.preventDefault();
    navigate(anchor.href);
  }

  const returnToDatasetList = useCallback(() => {
    if (history.state?.datasetListPath) {
      history.back();
    } else {
      history.pushState(null, '', '/datasets');
      setKeepList(true);
      setRoute('/datasets');
    }
  }, []);


  useEffect(() => {
    function onBack() {
      if (location.pathname.replace(/\/+$/, '') === '/datasets') setKeepList(true);
      setRoute(location.pathname + location.search);
    }
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  useEffect(() => {
    function onArtifactView(event: MessageEvent) {
      const frame = document.querySelector<HTMLIFrameElement>('iframe.settings-frame');
      if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
      const { type, id, mode } = event.data ?? {};
      if (type === 'zs-artifact-view' && typeof id === 'string' && (typeof mode === 'string' || mode === null)) {
        setArtifactView({ id, mode });
      }
    }
    window.addEventListener('message', onArtifactView);
    return () => window.removeEventListener('message', onArtifactView);
  }, []);

  function openSearch() {
    dialog.current?.showModal();
  }

  useEffect(() => {
    if (navOpen) menu.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();
  }, [navOpen]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else openSearch();
      }
      if (event.key === 'Escape' && navOpen && !dialog.current?.open) {
        setNavOpen(false);
        menuToggle.current?.focus();
      }
    }
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [navOpen]);

  return (
    <div className="app-shell" data-nav-open={navOpen} onClick={followDatasetLink}>
      <aside ref={menu} className="sidebar" id="workspace-menu">
        <a href="/" className="workspace">
          <img src="/zs-network-mark.svg" alt="" width={44} height={20} />
          <strong>ZS-RAG</strong>
        </a>
        <nav className="sidebar-nav" aria-label="工作区导航">
          <div className="nav-group primary-nav">
            <button className="nav-link search-trigger" onClick={openSearch}>
              <Search size={16} /><span>快速搜索</span><kbd className="key">Ctrl K</kbd>
            </button>
            <NavLink item={home} active={!isSettingsPage && !isDatasetsPage && !isDatasetDetail && !library} />
          </div>
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map((item) => <NavLink key={item.href} item={item}
                active={item.href === (library?.href ?? path) || (isDatasetDetail && item === datasets)} />)}
            </div>
          ))}
        </nav>
        <SidebarAccount hasSession={hasSession} settingsActive={isSettingsPage && !management} />
      </aside>
      <div className="main-shell">
        <header className="toolbar">
          <div className="breadcrumbs">
            <button ref={menuToggle} className="icon-button mobile-menu" aria-label="切换导航菜单" aria-expanded={navOpen}
              aria-controls="workspace-menu" onClick={() => setNavOpen(!navOpen)}><PanelLeft size={17} /></button>
            {section ? (
              <nav className="dataset-toolbar-crumb" aria-label="面包屑">
                <a href={home.href}>工作台</a>
                <span aria-hidden="true">/</span>
                {showDatasetBreadcrumb || libraryDetail ? (
                  <>
                    <a href={section.href}>{section.label}</a>
                    <span aria-hidden="true">/</span>
                    {showDatasetBreadcrumb ? (
                      <>
                        <h1 title={datasetName}><a href={datasetHome}>{datasetName}</a></h1>
                        {isParsedChunks && <>
                          <span aria-hidden="true">/</span>
                          <span aria-current="page">切片详情</span>
                        </>}
                      </>
                    ) : <h1>{libraryDetail}</h1>}
                  </>
                ) : <h1><a href={section.href}>{library?.title ?? section.label}</a></h1>}
              </nav>
            ) : <h1>工作台</h1>}
            {showDatasetBreadcrumb && path.startsWith('/dataset/compilation/') && (
              <a className="dataset-toolbar-back" href={datasetHome}>
                <ArrowLeft size={14} aria-hidden="true" /> 返回
              </a>
            )}
          </div>
          {path.startsWith('/dataset/compilation/') && showDatasetBreadcrumb
            && artifactView?.mode === 'graph' && encodeURIComponent(artifactView.id) === datasetIdSegment ? (
            <a className="dataset-toolbar-back" href={`/dataset/knowledge-graph/${datasetIdSegment}`}>查看原有图谱</a>
          ) : <div hidden={showDatasetBreadcrumb}><ThemeControl /></div>}
        </header>
        {keepList && <div hidden={!isDatasetsPage}>
          <DatasetsPage active={isDatasetsPage} detailHref={datasetFiles} onOpen={navigate} modelsHref={settingsPath + '/model'} />
        </div>}
        {isSettingsPage ? <SettingsShell /> : isDatasetDetail || library ? (
          <DatasetContentShell key={datasetFrameRevision} title={library?.label ?? '知识库详情'} onNavigate={setRoute} onDatasetTitle={setDatasetTitle} />
        ) : !isDatasetsPage && (
        <main id="dashboard" className="dashboard" aria-busy={data.status === 'loading'}>
          {data.status === 'demo' && (
            <div className="demo-notice">
              <Info size={15} /><span>当前展示演示数据。</span>
              <a href="/login-next">登录查看工作区</a>
            </div>
          )}
          <div className="overview-bar">
            <div>
              <h2>工作区概览</h2>
              {data.status === 'live' && <time className="updated-time" dateTime={data.summary.updated_at}>
                更新于 {new Date(data.summary.updated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </time>}
            </div>
            <div className="overview-controls">
              <div className="segments" role="group" aria-label="统计时段">
                {periods.map((option) => (
                  <button key={option.value} aria-pressed={period === option.value}
                    onClick={() => setPeriod(option.value)}>{option.label}</button>
                ))}
              </div>
              <button className="icon-button refresh" title="刷新数据" aria-label="刷新数据" onClick={refresh}
                disabled={data.status === 'loading'}><RefreshCw size={15} /></button>
            </div>
          </div>
          <div className="dashboard-actions">
            <a className="button" href="/datasets?isCreate=true">新建知识库</a>
            <a className="button" href={chatsPath + '?isCreate=true'}>新建问答助手</a>
          </div>
          {hasData ? (
            <DashboardContent summary={data.summary} datasets={data.datasets} period={period}
              datasetHref={loggedIn ? datasetFiles : () => datasets.href}
              datasetsHref={datasets.href} assistantsHref={chatsPath}
              assistantHref={loggedIn ? (id) => '/chat/' + encodeURIComponent(id) : () => chatsPath} />
          ) : data.status !== 'loading' && (
            <div className="panel dashboard-feedback" role="status">
              <MessageCircle size={20} />
              <p>{data.status === 'forbidden' ? '当前账户没有查看工作区统计的权限。' : '工作区数据加载失败，请刷新重试。'}</p>
              {data.status === 'error' && <button className="button" onClick={refresh}>重试</button>}
            </div>
          )}
        </main>
        )}
      </div>
      <SearchDialog dialogRef={dialog} navigate={navigate} datasets={loggedIn && data.datasets ? data.datasets.map((dataset) => ({
        label: dataset.name || '未命名知识库', icon: FileText, href: datasetFiles(dataset.id),
      })) : []} />
    </div>
  );
}
