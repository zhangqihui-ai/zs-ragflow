import { LayoutGrid, List, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DatasetDialog, type DatasetAction, type ParserCatalog } from './dataset-dialog';
import { builtinParsers, listDatasets, listOwners, pipelines, type BuiltinParser, type DatasetOwner, type DatasetRow, type Pipeline } from './datasets-api';
import { DatasetViews, type DatasetView } from './dataset-views';
import { api, ApiError, clearSession, loginUrl, readSession } from './session';

const pageSize = 10;
const number = new Intl.NumberFormat('zh-CN');
const dateTime = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

function initialFilters() {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get('page'));
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    keywords: params.get('keywords') ?? '',
    owners: params.get('owner_ids')?.split(',').filter(Boolean) ?? [],
    create: params.get('isCreate') === 'true',
  };
}

export function DatasetsPage({ active, detailHref, onOpen, modelsHref }: {
  active: boolean;
  detailHref: (id: string) => string;
  onOpen: (href: string) => void;
  modelsHref: string;
}) {
  const [token] = useState(readSession);
  const [initial] = useState(initialFilters);
  const [page, setPage] = useState(initial.page);
  const [view, setView] = useState<DatasetView>('cards');
  const [keywords, setKeywords] = useState(initial.keywords);
  const [search, setSearch] = useState(initial.keywords);
  const [owners, setOwners] = useState(initial.owners);
  const [ownerOptions, setOwnerOptions] = useState<DatasetOwner[]>([]);
  const [ownerError, setOwnerError] = useState('');
  const [catalog, setCatalog] = useState<ParserCatalog | null>(null);
  const [action, setAction] = useState<DatasetAction | null>(initial.create ? { kind: 'create' } : null);
  const [revision, setRevision] = useState(0);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<{ query: string; rows: DatasetRow[]; total: number; error: string }>();
  const wasActive = useRef(active);
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search.trim()) query.set('keywords', search.trim());
  if (owners.length) query.set('owner_ids', owners.join(','));
  const queryString = query.toString();
  const displayed = result?.query === queryString ? result : undefined;

  useEffect(() => {
    if (active && !wasActive.current) setRevision((value) => value + 1);
    wasActive.current = active;
  }, [active]);

  const onError = useCallback((reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 401 && token) {
      if (readSession() !== token) window.location.reload();
      else {
        clearSession(token);
        window.location.replace(loginUrl(true));
      }
    }
    return reason instanceof Error ? reason.message : '请求失败，请重试。';
  }, [token]);

  useEffect(() => {
    if (!token) window.location.replace(loginUrl());
    const sync = () => { if (readSession() !== token) window.location.reload(); };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, [token]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (search === keywords) return;
      setSearch(keywords);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [keywords, search]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    listDatasets(new URLSearchParams(queryString), token, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      const rows = response.data ?? [];
      const total = response.total_datasets ?? rows.length;
      const last = Math.max(1, Math.ceil(total / pageSize));
      if (page > last) setPage(last);
      else setResult({ query: queryString, rows, total, error: '' });
    }).catch((reason) => {
      if (!controller.signal.aborted) setResult({ query: queryString, rows: [], total: 0, error: onError(reason) });
    });
    return () => controller.abort();
  }, [token, queryString, page, revision, onError]);

  useEffect(() => {
    if (!active || !token) return;
    const params = new URLSearchParams(queryString);
    if (new URLSearchParams(location.search).get('isCreate') === 'true') params.set('isCreate', 'true');
    history.replaceState(history.state, '', location.pathname + '?' + params);
  }, [active, queryString, token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    listOwners(token, controller.signal).then((items) => {
      if (!controller.signal.aborted) {
        setOwnerOptions(items);
        setOwnerError('');
      }
    }).catch((reason) => {
      if (!controller.signal.aborted) setOwnerError(onError(reason));
    });
    return () => controller.abort();
  }, [token, catalogRevision, onError]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const { signal } = controller;
    Promise.allSettled([
      api<{ canvas: BuiltinParser[] }>(builtinParsers, { signal }, token),
      api<Pipeline[]>(pipelines, { signal }, token),
    ]).then(([builtins, versions]) => {
      if (signal.aborted) return;
      const unavailable: string[] = [];
      if (builtins.status === 'rejected') {
        onError(builtins.reason);
        unavailable.push('内置解析器');
      }
      if (versions.status === 'rejected') {
        onError(versions.reason);
        unavailable.push('数据管道版本');
      }
      setCatalog({
        builtins: builtins.status === 'fulfilled' ? builtins.value.canvas ?? [] : [],
        pipelines: versions.status === 'fulfilled' ? versions.value ?? [] : [],
        unavailable,
      });
    });
    return () => controller.abort();
  }, [token, catalogRevision, onError]);

  function reload() {
    setRevision((value) => value + 1);
    setCatalogRevision((value) => value + 1);
  }

  function changeOwners(next: string[]) {
    setOwners(next);
    setPage(1);
  }

  function close() {
    const current = new URL(window.location.href);
    if (current.searchParams.has('isCreate')) {
      current.searchParams.delete('isCreate');
      window.history.replaceState(null, '', current.pathname + current.search);
    }
    setAction(null);
  }

  function finish(id?: string) {
    if (id) {
      close();
      onOpen(detailHref(id));
      return;
    }
    setNotice(action?.kind === 'delete' ? '知识库已删除。' : '知识库已重命名。');
    close();
    reload();
  }

  if (!token) return <main className="dashboard"><p role="status">正在前往登录页…</p></main>;

  const pageCount = Math.max(1, Math.ceil((displayed?.total ?? 0) / pageSize));
  return (
    <main className="dashboard datasets-page" aria-busy={!displayed}>
      <div className="dataset-controls">
        <label className="form-field dataset-search"><Search size={15} /><input aria-label="搜索知识库" placeholder="搜索知识库" value={keywords}
          onChange={(event) => setKeywords(event.target.value)} /></label>
        <details className="owner-filter">
          <summary className="button">所有者{owners.length > 0 ? ' · ' + owners.length : ''}</summary>
          <div className="panel owner-options">
            {ownerError && <p className="auth-error" role="alert">{ownerError}</p>}
            {!ownerError && !ownerOptions.length && <p className="dataset-hint">暂无所有者选项</p>}
            {ownerOptions.map((owner) => <label key={owner.id}>
              <input type="checkbox" checked={owners.includes(owner.id)}
                onChange={(event) => changeOwners(event.target.checked ? [...owners, owner.id] : owners.filter((id) => id !== owner.id))} />
              <span>{owner.label || owner.id}（{owner.count}）</span>
            </label>)}
            {owners.length > 0 && <button className="button" onClick={() => changeOwners([])}>清除筛选</button>}
          </div>
        </details>
        <button className="icon-button refresh" onClick={reload} aria-label="刷新知识库"><RefreshCw size={15} /></button>
        <div className="segments dataset-view-toggle" role="group" aria-label="知识库视图">
          <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}><LayoutGrid size={14} />卡片视图</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={14} />列表视图</button>
        </div>
        <button className="button auth-primary create-dataset" onClick={() => setAction({ kind: 'create' })}><Plus size={15} />新建知识库</button>
      </div>
      {notice && <p className="dataset-notice" role="status">{notice}</p>}
      {!displayed ? null : displayed.error ? (
        <div className="panel empty-text" role="alert">{displayed.error} <button className="button" onClick={reload}>重试</button></div>
      ) : displayed.rows.length === 0 ? (
        <p className="panel empty-text">{search.trim() || owners.length ? '没有匹配的知识库' : '暂无知识库'}</p>
      ) : view === 'list' || catalog || !displayed.rows.some((dataset) => dataset.pipeline_id) ? (
        <DatasetViews view={view} rows={displayed.rows} catalog={catalog} offset={(page - 1) * pageSize}
          detailHref={detailHref} onOpen={onOpen} onAction={setAction} />
      ) : null}
      {displayed && !displayed.error && <footer className="dataset-pagination">
        <span>共 {number.format(displayed.total)} 个知识库</span>
        <span>每页 {pageSize} 条</span>
        <button className="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
        <form onSubmit={(event) => {
          event.preventDefault();
          const target = Number(new FormData(event.currentTarget).get('page'));
          if (Number.isSafeInteger(target) && target > 0 && target <= pageCount) setPage(target);
        }}><input aria-label="跳转页码" key={page} name="page" type="number" min="1" max={pageCount} defaultValue={page} required /><span> / {pageCount}</span></form>
        <button className="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>下一页</button>
      </footer>}
      {action && <DatasetDialog action={action} catalog={catalog} token={token} close={close} finish={finish} onError={onError} modelsHref={modelsHref} />}
    </main>
  );
}
