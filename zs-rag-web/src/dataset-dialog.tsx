import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createDataset, deleteDataset, embeddingOptions, renameDataset, type BuiltinParser, type DatasetRow, type Pipeline } from './datasets-api';
import { readSession } from './session';

export type DatasetAction = { kind: 'create' } | { kind: 'rename' | 'delete'; dataset: DatasetRow };
export type ParserCatalog = { builtins: BuiltinParser[]; pipelines: Pipeline[]; unavailable: string[] };

const parserLabels: Record<string, string> = {
  general: '通用', qa: '问答', resume: '简历', manual: '手册', table: '表格',
  paper: '论文', book: '书籍', laws: '法规', presentation: '演示文稿', picture: '图片',
  one: '全文', audio: '音频', email: '邮件', tag: '标签',
};

export function parserLabel(parser: BuiltinParser) {
  return parserLabels[parser.id] ? parser.title + ' · ' + parserLabels[parser.id] : parser.title;
}

export function DatasetDialog({ action, token, catalog, close, finish, onError, modelsHref }: {
  action: DatasetAction;
  token: string;
  catalog: ParserCatalog | null;
  close: () => void;
  finish: (id?: string) => void;
  onError: (error: unknown) => string;
  modelsHref: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [models, setModels] = useState<Awaited<ReturnType<typeof embeddingOptions>> | null>(null);
  const [modelError, setModelError] = useState('');
  const [modelRevision, setModelRevision] = useState(0);
  const [parser, setParser] = useState('builtin:general');

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (action.kind !== 'create') return;
    const controller = new AbortController();
    embeddingOptions(token, controller.signal).then((options) => {
      if (!controller.signal.aborted) setModels(options);
    }).catch((reason) => {
      if (!controller.signal.aborted) setModelError(onError(reason));
    });
    return () => controller.abort();
  }, [action.kind, token, modelRevision, onError]);

  function dismiss() {
    if (pending.current) return;
    dialog.current?.close();
    close();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (readSession() !== token) {
      window.location.reload();
      return;
    }
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get('name') ?? '').trim();
    if (action.kind !== 'delete' && !name) {
      setError('请输入知识库名称。');
      return;
    }

    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (action.kind === 'create') {
        const embedding_model = String(fields.get('model') ?? '');
        const [kind, id, version] = String(fields.get('parser') ?? '').split(':');
        if (!embedding_model || !id || (kind === 'pipeline' && !version)) {
          setError('请选择 Embedding 模型和解析方式。');
          return;
        }
        const created = await createDataset(kind === 'pipeline'
          ? { name, embedding_model, parse_type: 2, pipeline_id: id, pipeline_version_id: version }
          : { name, embedding_model, parse_type: 1, parser_id: id }, token);
        if (!created?.id) throw new Error('后端未返回知识库 ID，请刷新列表核对创建结果。');
        dialog.current?.close();
        finish(created.id);
      } else {
        if (action.kind === 'rename') await renameDataset(action.dataset.id, name, token);
        else await deleteDataset(action.dataset.id, token);
        dialog.current?.close();
        finish();
      }
    } catch (reason) {
      setError(onError(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const title = { create: '新建知识库', rename: '重命名知识库', delete: '删除知识库' }[action.kind];
  const parserOptions = catalog?.builtins ?? [];
  const pipelineOptions = catalog?.pipelines.filter((pipeline) => pipeline.versions?.length) ?? [];
  const selectedParser = parser === 'builtin:general' && !parserOptions.some((option) => option.id === 'general') ? '' : parser;
  const canCreate = !!models?.options.length && Boolean(selectedParser);
  return (
    <dialog className="dataset-dialog panel" ref={dialog} aria-labelledby="dataset-dialog-title"
      onCancel={(event) => { event.preventDefault(); dismiss(); }}>
      <h2 id="dataset-dialog-title">{title}</h2>
      <form className="dataset-form" onSubmit={submit}>
        {action.kind === 'delete' ? (
          <p>确认删除「{action.dataset.name}」？该操作无法撤销。</p>
        ) : <label>名称<input name="name" required autoFocus defaultValue={action.kind === 'rename' ? action.dataset.name : ''} /></label>}
        {action.kind === 'create' && <>
          <label>Embedding 模型
            {models ? <select name="model" required defaultValue={models.defaultId}>
              <option value="" disabled>请选择 Embedding 模型</option>
              {models.options.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select> : <span className="dataset-hint">{modelError || '正在加载模型…'}</span>}
          </label>
          {modelError && <button type="button" className="button" onClick={() => {
            setModelError(''); setModelRevision((revision) => revision + 1);
          }}>重新加载模型</button>}
          {models?.options.length === 0 && <p className="dataset-hint">当前没有可选的 Embedding 模型，请先在<a href={modelsHref}>原版模型设置</a>中添加。</p>}
          <label>解析方式
            <select name="parser" required value={selectedParser} disabled={!catalog} onChange={(event) => setParser(event.target.value)}>
              <option value="" disabled>{catalog ? '请选择解析方式' : '正在加载解析选项…'}</option>
              {parserOptions.length > 0 && <optgroup label="内置解析器">
                {parserOptions.map((option) => <option key={option.id} value={'builtin:' + option.id}>{parserLabel(option)}</option>)}
              </optgroup>}
              {pipelineOptions.map((pipeline) => <optgroup key={pipeline.id} label={pipeline.name}>
                {pipeline.versions.map((version) => <option key={version.id} value={'pipeline:' + pipeline.id + ':' + version.id}>
                  {pipeline.name} · {version.alias || version.name || version.id}
                </option>)}
              </optgroup>)}
            </select>
          </label>
          {!!catalog?.unavailable.length && <p className="dataset-hint">暂时无法加载{catalog.unavailable.join('、')}。关闭后可刷新列表重试。</p>}
        </>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <footer className="dataset-dialog-actions">
          <button className="button" type="button" onClick={dismiss} disabled={busy}>取消</button>
          <button className={'button ' + (action.kind === 'delete' ? 'dataset-danger' : 'auth-primary')}
            type="submit" disabled={busy || (action.kind === 'create' && !canCreate)}>
            {busy ? '处理中…' : action.kind === 'delete' ? '确认删除' : '保存'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
