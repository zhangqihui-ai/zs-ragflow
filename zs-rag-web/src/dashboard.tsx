import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, Coins, Database, FileText, MessageSquare, MessagesSquare } from 'lucide-react';
import type { Dashboard, Dataset, Period } from './dashboard-data';

const number = new Intl.NumberFormat('zh-CN');
const compact = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' });
const hour = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const metrics = [
  { key: 'knowledge_bases', label: '知识库', caption: '当前工作区', icon: Database },
  { key: 'documents', label: '文档', caption: '知识库中的文档', icon: FileText },
  { key: 'conversations', label: '会话', caption: '已保存的问答会话', icon: MessagesSquare },
  { key: 'messages', label: '消息', caption: '已保存的问答消息', icon: MessageSquare },
  { key: 'total_tokens', label: 'Token 总量', caption: '已记录用量', icon: Coins },
] as const;

function ActivityChart({ trend, period }: { trend: Dashboard['trend']; period: Period }) {
  const total = trend.reduce((sum, point) => sum + point.llm, 0);
  const max = Math.max(1, ...trend.map((point) => point.llm));
  const targetStep = max / 3;
  const unit = Math.max(1, 10 ** Math.floor(Math.log10(targetStep)));
  const multiplier = [1, 2, 5, 10].find((value) => value * unit >= targetStep) ?? 10;
  const step = multiplier * unit;
  const labels = [step * 3, step * 2, step, 0];
  const labelInterval = Math.ceil(trend.length / 7);
  const formatter = period === '24h' ? hour : date;

  return (
    <section className="panel chart-panel activity-chart">
      <div className="panel-heading">
        <div><h2>问答调用趋势</h2><p>已保存的问答调用，暂无嵌入调用历史</p></div>
        <BarChart3 size={17} className="panel-icon" />
      </div>
      <div className="chart-summary"><strong>{number.format(total)}</strong><span><i />模型调用</span></div>
      {total ? (
        <div className="chart" aria-label="问答调用柱状图">
          <div className="chart-grid" aria-hidden="true">
            {labels.map((label) => <div key={label}><span>{compact.format(label)}</span><i /></div>)}
          </div>
          <div className="chart-bars">
            {trend.map((point, index) => {
              const label = formatter.format(new Date(point.time));
              return (
                <div className="chart-column" key={point.time}>
                  <div className="bar-track" title={label + ' · ' + number.format(point.llm) + ' 次'}
                    aria-label={label + '，' + number.format(point.llm) + ' 次'} role="img">
                    <div className="bar" style={{ height: (point.llm / labels[0]) * 100 + '%' }} />
                  </div>
                  <span className="bar-label" aria-hidden="true">{index % labelInterval === 0 ? label : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : <p className="empty-text chart-empty">所选时段暂无调用记录</p>}
    </section>
  );
}

const fileTypeColors = new Map([
  ['docx', 'var(--chart-violet)'],
  ['txt', 'var(--chart-green)'],
  ['pdf', 'var(--chart-blue)'],
]);
const otherFileColor = 'var(--chart-other)';

function FileDistribution({ files }: { files: Dashboard['file_types'] }) {
  const sorted = [...files].sort((first, second) => second.count - first.count);
  const types = sorted.slice(0, 4);
  const remainingColors = ['var(--chart-amber)', ...fileTypeColors.values()].filter(
    (color) => !types.some(({ name }) => fileTypeColors.get(name.toLowerCase()) === color),
  );
  const colors = types.map(({ name }) => fileTypeColors.get(name.toLowerCase()) ?? remainingColors.shift());
  if (sorted.length > 4) types.push({
    name: '其他',
    count: sorted.slice(4).reduce((sum, type) => sum + type.count, 0),
  });
  const total = types.reduce((sum, type) => sum + type.count, 0);
  let offset = 0;
  const stops = total ? types.map((type, index) => {
    const start = offset;
    offset += type.count / total * 100;
    return (colors[index] ?? otherFileColor) + ' ' + start + '% ' + offset + '%';
  }) : [];

  return (
    <section className="panel chart-panel">
      <div className="panel-heading"><div><h2>文档类型</h2><p>按文件格式查看文档分布</p></div><FileText size={17} className="panel-icon" /></div>
      {total ? (
        <div className="distribution">
          <div className="donut" style={{ backgroundImage: 'conic-gradient(' + stops.join(',') + ')' }}>
            <div><strong>{number.format(total)}</strong><small>份文档</small></div>
          </div>
          <ul className="legend">
            {sorted.map((type, index) => (
              <li key={type.name + index}>
                <i style={{ backgroundColor: colors[index] ?? otherFileColor }} />
                <span title={type.name}>{type.name.toUpperCase()}</span>
                <strong>{number.format(type.count)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="empty-text chart-empty">暂无文档</p>}
    </section>
  );
}

function ListHeader({ title, href, linkText }: { title: string; href: string; linkText: string }) {
  return <div className="panel-heading list-heading"><h2>{title}</h2><a href={href}>{linkText}<ArrowRight size={13} /></a></div>;
}

function Ranking({ rows, href, empty }: {
  rows: Dashboard['assistants'];
  href: (id: string) => string;
  empty: string;
}) {
  return rows.length ? (
    <ul>
      {rows.map((row, index) => (
        <li key={row.id}>
          <a className="list-row rank-link" href={href(row.id)}>
            <span className="rank">{index + 1}</span>
            <span className="row-copy"><strong title={row.name}>{row.name || '未命名'}</strong></span>
            <span className="row-meta">{number.format(row.count)} 次</span>
          </a>
        </li>
      ))}
    </ul>
  ) : <p className="empty-text">{empty}</p>;
}

const tokenSeries = [
  { key: 'input', label: '输入', color: 'var(--chart-blue)' },
  { key: 'output', label: '输出', color: 'var(--accent)' },
  { key: 'unclassified', label: '未分类', color: 'var(--chart-other)' },
] as const;

function TokenUsage({ summary }: { summary: Dashboard }) {
  const max = Math.max(0, ...summary.daily.map((point) => point.total));
  return (
    <section className="panel usage-panel">
      <div className="panel-heading"><div><h2>Token 用量</h2><p>近 30 天每日用量</p></div></div>
      <dl className="usage-stats">
        <div><dt>总量</dt><dd>{number.format(summary.total_tokens)}</dd></div>
        <div><dt>输入</dt><dd>{number.format(summary.input_tokens)}</dd></div>
        <div><dt>输出</dt><dd>{number.format(summary.output_tokens)}</dd></div>
        <div><dt>所选时段</dt><dd>{number.format(summary.period_tokens)}</dd></div>
      </dl>
      {max > 0 ? (
        <>
          <ul className="token-legend">
            {tokenSeries.map(({ key, label, color }) => <li key={key}><i style={{ background: color }} />{label}</li>)}
          </ul>
          <div className="chart token-chart" role="group" aria-label="每日 Token 用量">
            <div className="chart-grid" aria-hidden="true">
              {[max, Math.round(max / 2), 0].map((value, index) => <div key={index}><span>{compact.format(value)}</span><i /></div>)}
            </div>
            <div className="chart-bars">
              {summary.daily.map((point, index) => {
                const day = date.format(new Date(point.time));
                const detail = day + ' · ' + tokenSeries.map(({ key, label }) =>
                  label + ' ' + number.format(point[key]),
                ).join(' · ');
                return (
                  <div className="chart-column" key={point.time}>
                    <div className="bar-track" role="img" aria-label={detail} title={detail}>
                      <div className="bar-stack">
                        {tokenSeries.map(({ key, color }) => <div className="bar" key={key}
                          style={{ background: color, height: (point[key] / max) * 100 + '%' }} />)}
                      </div>
                    </div>
                    <span className="bar-label" aria-hidden="true">{index % 5 === 0 ? day : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : <p className="empty-text chart-empty">近 30 天暂无用量记录</p>}
      <p className="usage-note">统计已保存的问答用量，包含输入、输出与未分类用量。
        {summary.missing_usage > 0 && ' 有 ' + number.format(summary.missing_usage) + ' 条回复缺少用量记录。'}
        {summary.unclassified_tokens > 0 && ' 未分类用量 ' + number.format(summary.unclassified_tokens) + ' Token。'}
      </p>
    </section>
  );
}

export function DashboardContent({ summary, datasets, period, datasetHref, datasetsHref, assistantHref, assistantsHref }: {
  summary: Dashboard;
  datasets: Dataset[] | null;
  period: Period;
  datasetHref: (id: string) => string;
  datasetsHref: string;
  assistantsHref: string;
  assistantHref: (id: string) => string;
}) {
  return (
    <>
      <div className="metrics">
        {metrics.map(({ key, label, caption, icon: Icon }) => (
          <section className="metric" key={key}>
            <div><strong>{number.format(summary[key])}</strong><h3>{label}</h3><p>{caption}</p></div>
            <span className="metric-icon"><Icon size={17} /></span>
          </section>
        ))}
      </div>
      <div className="charts-grid">
        <ActivityChart trend={summary.trend} period={period} />
        <FileDistribution files={summary.file_types} />
        <section className="panel chart-panel">
          <div className="panel-heading"><div><h2>问答调用峰值</h2><p>{period === '24h' ? '单小时最高调用量' : '单日最高调用量'}</p></div></div>
          {summary.trend.some((point) => point.llm > 0) ? (
            <div className="peak">
              <strong>{number.format(Math.max(...summary.trend.map((point) => point.llm)))}</strong>
              <span>次</span>
            </div>
          ) : <p className="empty-text chart-empty">所选时段暂无调用记录</p>}
        </section>
      </div>
      <div className="lists-grid">
        <section className="list-panel">
          <ListHeader title="最近更新的知识库" href={datasetsHref} linkText="全部知识库" />
          {datasets?.length ? <ul>
            {datasets.map((dataset) => {
              const name = dataset.name || '未命名知识库';
              const updated = dataset.update_time ?? dataset.create_time;
              return <li key={dataset.id}>
                <a className="list-row dataset-row" href={datasetHref(dataset.id)}>
                  <span className="row-icon"><BookOpen size={16} /></span>
                  <span className="row-copy"><strong title={name}>{name}</strong>
                    {dataset.description && <small title={dataset.description}>{dataset.description}</small>}
                  </span>
                  <span className="row-meta">{number.format(dataset.document_count)} 份文档</span>
                  {updated != null && <time className="row-date" dateTime={new Date(updated).toISOString()}>{date.format(updated)}</time>}
                  <ArrowUpRight className="row-arrow" size={14} />
                </a>
              </li>;
            })}
          </ul> : <p className="empty-text">{datasets ? '暂无知识库' : '最近知识库暂时无法加载'}</p>}
        </section>
        <section className="list-panel">
          <ListHeader title="活跃问答助手" href={assistantsHref} linkText="问答助手" />
          <Ranking rows={summary.assistants} href={assistantHref} empty="所选时段暂无助手调用记录" />
        </section>
        <section className="list-panel">
          <ListHeader title="知识库召回排行" href={datasetsHref} linkText="知识库" />
          <Ranking rows={summary.recall} href={datasetHref} empty="所选时段暂无知识库召回记录" />
        </section>
        <section className="list-panel">
          <ListHeader title="知识库存储" href={datasetsHref} linkText="管理知识库" />
          <p className="empty-text">{summary.storage_bytes < 1024 ** 3
            ? (summary.storage_bytes / 1024 ** 2).toFixed(1) + ' MB'
            : (summary.storage_bytes / 1024 ** 3).toFixed(2) + ' GB'}</p>
        </section>
      </div>
      <TokenUsage summary={summary} />
    </>
  );
}
