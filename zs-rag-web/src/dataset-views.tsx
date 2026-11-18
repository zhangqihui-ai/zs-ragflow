import { Database, Ellipsis, FileText, Route, Waypoints } from 'lucide-react';
import { RAGFlowAvatar } from '@/components/ragflow-avatar';
import type { CSSProperties, MouseEvent } from 'react';
import { parserLabel, type DatasetAction, type ParserCatalog } from './dataset-dialog';
import type { DatasetRow } from './datasets-api';
import { CompilationAvatar, builtinPipelineAppearance, compilationAppearance } from './settings/compilation-appearance';

export type DatasetView = 'cards' | 'list';

const number = new Intl.NumberFormat('zh-CN');
const dateTime = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
const compactDateTime = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
const statuses: Record<string, string> = { empty: '暂无文档', ready: '已完成', running: '解析中', failed: '解析失败', pending: '待解析', unknown: '未知' };
const graphPipeline = /图谱|(?:^|[\s_-])(?:knowledge[\s_-]*graph|graph[\s_-]*rag|graph)(?:$|[\s_-])/i;

function parserName(dataset: DatasetRow, catalog: ParserCatalog | null, pipelineName?: string) {
  if (dataset.pipeline_id) return pipelineName || '数据管道';
  const id = dataset.parser_id === 'naive' ? 'general' : dataset.parser_id;
  const match = catalog?.builtins.find((parser) => parser.id === id);
  return match ? parserLabel(match) : id || '未配置';
}

function DatasetStatus({ summary }: { summary: DatasetRow['parsing_summary'] }) {
  const status = summary?.status ?? 'unknown';
  const detail = summary && '已完成 ' + summary.completed + ' · 解析中 ' + summary.running
    + ' · 失败 ' + summary.failed + ' · 待解析 ' + summary.pending;
  return <span className="dataset-status" data-status={status} title={detail}><i />{statuses[status] || statuses.unknown}</span>;
}

function DatasetActions({ dataset, onAction }: { dataset: DatasetRow; onAction: (action: DatasetAction) => void }) {
  const mask = dataset.operator_permission ?? 8;
  const canRename = (mask & (2 | 8)) !== 0;
  const canDelete = (mask & (4 | 8)) !== 0;
  if (!canRename && !canDelete) return null;

  return (
    <details className="dataset-row-actions">
      <summary className="icon-button" aria-label={dataset.name + '的操作'} title="更多操作"><Ellipsis size={16} /></summary>
      <div className="panel">
        {canRename && <button className="nav-link" onClick={(event) => {
          event.currentTarget.closest('details')?.removeAttribute('open');
          onAction({ kind: 'rename', dataset });
        }}>重命名</button>}
        {canDelete && <button className="nav-link" onClick={(event) => {
          event.currentTarget.closest('details')?.removeAttribute('open');
          onAction({ kind: 'delete', dataset });
        }}>删除</button>}
      </div>
    </details>
  );
}

function UpdateTime({ value, compact = false }: { value: Date | null; compact?: boolean }) {
  return value ? (
    <time dateTime={value.toISOString()} title={compact ? dateTime.format(value) : undefined}>
      {compact ? compactDateTime.format(value).replaceAll('-', '/') : dateTime.format(value)}
    </time>
  ) : '—';
}

function openDatasetRow(event: MouseEvent<HTMLTableRowElement>, href: string, onOpen: (href: string) => void) {
  if (!(event.target instanceof Element) || event.target.closest('a, button, details')) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || window.getSelection()?.type === 'Range') return;
  onOpen(href);
}

export function DatasetViews({ view, rows, catalog, offset, detailHref, onOpen, onAction }: {
  view: DatasetView;
  rows: DatasetRow[];
  catalog: ParserCatalog | null;
  offset: number;
  detailHref: (id: string) => string;
  onOpen: (href: string) => void;
  onAction: (action: DatasetAction) => void;
}) {
  const items = rows.map((dataset) => {
    const updated = dataset.update_time ?? dataset.update_date;
    const date = updated == null ? null : new Date(updated);
    const pipeline = dataset.pipeline_id ? catalog?.pipelines.find(({ id }) => id === dataset.pipeline_id) : undefined;
    const parser = parserName(dataset, catalog, pipeline?.name);
    const pipelineType = graphPipeline.test([dataset.pipeline_id, dataset.parser_id, parser].filter(Boolean).join(' '))
      ? 'graph'
      : dataset.pipeline_id || dataset.parser_id ? 'pipeline' : 'unconfigured';
    return {
      dataset,
      href: detailHref(dataset.id),
      description: dataset.description?.trim() || '暂无描述',
      model: dataset.embedding_model_name || dataset.embedding_model || '未配置',
      parser,
      pipeline,
      appearance: dataset.pipeline_id
        ? compilationAppearance(pipeline?.compilation_kind ?? '')
        : builtinPipelineAppearance(dataset.parser_id),
      pipelineType,
      documents: number.format(dataset.parsing_summary?.total ?? dataset.document_count ?? 0),
      date: date && Number.isFinite(date.getTime()) ? date : null,
    };
  });

  if (view === 'cards') {
    return (
      <ul className="dataset-grid" aria-label="知识库卡片">
        {items.map(({ dataset, href, description, model, parser, pipeline, appearance, pipelineType, documents, date }) => (
          <li className="panel dataset-card" key={dataset.id} data-pipeline-type={pipelineType}
            data-pipeline-gradient={appearance ? 'true' : undefined}
            style={appearance && { '--pipeline-from': appearance.from, '--pipeline-to': appearance.to } as CSSProperties}>
            <a className="dataset-card-link" href={href} aria-label={dataset.name}>
              <div className="dataset-card-heading">
                {appearance ? <CompilationAvatar appearance={appearance} />
                : pipeline ? <RAGFlowAvatar className="dataset-pipeline-avatar" name={pipeline.name} avatar={pipeline.avatar} aria-hidden="true" />
                : <span className="row-icon" data-pipeline-type={pipelineType} aria-hidden="true">
                  {pipelineType === 'graph' ? <Waypoints size={16} />
                    : pipelineType === 'pipeline' ? <Route size={16} /> : <Database size={16} />}
                </span>}
                <h2 className="dataset-truncate" title={dataset.name}>{dataset.name}</h2>
              </div>
              <p className="dataset-card-description dataset-truncate" title={description}>{description}</p>
              <div className="dataset-card-tags">
                <span className="dataset-tag dataset-truncate dataset-model-tag" title={'嵌入模型 · ' + model}>{model.split(/@|__/)[0]}</span>
                <span className="dataset-tag dataset-truncate dataset-pipeline-tag" title={'数据处理流程 · ' + parser}>{parser}</span>
              </div>
              <div className="dataset-card-footer">
                <span className="dataset-count"><FileText size={13} />{documents} 份文档</span>
                <DatasetStatus summary={dataset.parsing_summary} />
                <span><UpdateTime value={date} compact /></span>
              </div>
            </a>
            <DatasetActions dataset={dataset} onAction={onAction} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="panel dataset-table-scroll" role="region" aria-label="知识库列表" tabIndex={0}>
      <table className="dataset-table" aria-label="知识库列表">
        <colgroup><col /><col /><col /><col /><col /><col /><col /><col /><col /></colgroup>
        <thead>
          <tr>
            <th scope="col">序号</th><th scope="col">知识库名称</th><th scope="col">描述</th>
            <th scope="col">嵌入模型</th><th scope="col">处理管道</th><th scope="col">文档数量</th>
            <th scope="col">状态</th><th scope="col">更新时间</th><th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ dataset, href, description, model, parser, documents, date }, index) => (
            <tr key={dataset.id} onClick={(event) => openDatasetRow(event, href, onOpen)}>
              <td>{offset + index + 1}</td>
              <th scope="row"><a className="dataset-truncate" href={href} title={dataset.name}>{dataset.name}</a></th>
              <td><span className="dataset-truncate" title={description}>{description}</span></td>
              <td><span className="dataset-truncate" title={model}>{model}</span></td>
              <td><span className="dataset-truncate" title={parser}>{parser}</span></td>
              <td>{documents}</td>
              <td><DatasetStatus summary={dataset.parsing_summary} /></td>
              <td><UpdateTime value={date} /></td>
              <td><DatasetActions dataset={dataset} onAction={onAction} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
