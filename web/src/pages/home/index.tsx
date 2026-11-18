import { Button } from '@/components/ui/button';
import { CreateButton } from '@/components/create-button';
import { Card } from '@/components/ui/card';
import { Segmented, SegmentedValue } from '@/components/ui/segmented';
import { TruncatedText } from '@/components/truncated-text';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import {
  Database,
  FileText,
  MessagesSquare,
  MessageSquare,
  Coins,
  ArrowUpRight,
  RefreshCw,
  HardDrive,
  ArrowDownLeft,
  ArrowUpLeft,
  BarChart3,
  Activity,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DashboardData,
  DashboardPeriod,
  DashboardRank,
  useDashboard,
} from './dashboard-data';

const ChartColors = [
  'var(--dashboard-blue)',
  'var(--dashboard-teal)',
  'var(--dashboard-purple)',
  'var(--dashboard-orange)',
  'var(--dashboard-cyan)',
  'var(--dashboard-muted)',
];
const NumberFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});
const CompactFormat = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const ChartTooltipStyle = {
  background: 'var(--bg-base)',
  border: '1px solid var(--border-button)',
  borderRadius: 12,
  fontSize: 12,
  color: 'rgb(var(--text-primary))',
};

function EmptyChart() {
  const { t } = useTranslation();
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-3 text-text-secondary">
      <BarChart3 className="size-8 opacity-30" />
      <p className="text-sm">{t('dashboard.empty')}</p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className,
}: React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon?: typeof Database;
  action?: React.ReactNode;
  className?: string;
}>) {
  return (
    <Card
      className={cn(
        'min-w-0 rounded-2xl border-border-button bg-bg-base p-5 shadow-none',
        className,
      )}
    >
      <div className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-nav-active-bg text-nav-active-text">
              <Icon className="size-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Database;
  tone?: string;
  hint?: string;
}) {
  return (
    <Card className="flex min-w-0 items-center gap-4 rounded-2xl border-border-button bg-bg-base p-5 shadow-none">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: `color-mix(in srgb, var(--dashboard-${tone}) 12%, transparent)`,
          color: `var(--dashboard-${tone})`,
        }}
      >
        <Icon className="size-5 stroke-[1.6]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-text-secondary" title={label}>
          {label}
        </p>
        <p
          className="mt-1 truncate text-[26px] font-semibold leading-tight tracking-tight text-text-primary"
          title={value}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-1 truncate text-xs text-text-secondary" title={hint}>
            {hint}
          </p>
        )}
      </div>
    </Card>
  );
}

function Ranking({
  rows,
  kind,
}: {
  rows: DashboardRank[];
  kind: 'assistant' | 'dataset';
}) {
  const { t } = useTranslation();
  if (!rows.length) return <EmptyChart />;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <ol className="space-y-5 py-2">
      {rows.map((row, index) => (
        <li key={row.id} className="flex min-w-0 items-center gap-3">
          <span className="w-4 shrink-0 text-xs tabular-nums text-text-secondary">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
              <Link
                to={
                  kind === 'dataset'
                    ? `${Routes.Dataset}/${row.id}`
                    : `${Routes.Chat}/${row.id}`
                }
                className="min-w-0 flex-1 text-sm text-text-primary hover:text-nav-active-text"
              >
                <TruncatedText className="truncate" tooltip={row.name}>
                  {row.name || t('dashboard.unnamed')}
                </TruncatedText>
              </Link>
              <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                {NumberFormat.format(row.count)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-card">
              <div
                className="h-full rounded-full bg-nav-active-text"
                style={{
                  width: `${(row.count / max) * 100}%`,
                  opacity: 1 - index * 0.12,
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function CallTrend({
  data,
  period,
}: {
  data: DashboardData;
  period: DashboardPeriod;
}) {
  if (!data.trend.some((point) => point.llm > 0)) return <EmptyChart />;
  return (
    <div className="h-64 min-w-0" data-testid="call-trend">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data.trend}
          margin={{ top: 10, right: 12, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient
              id="dashboard-call-fill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={ChartColors[0]} stopOpacity={0.2} />
              <stop
                offset="100%"
                stopColor={ChartColors[0]}
                stopOpacity={0.01}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border-button)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="time"
            tickFormatter={(value) =>
              dayjs(value).format(period === '24h' ? 'HH:mm' : 'MM/DD')
            }
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }}
          />
          <Tooltip
            contentStyle={ChartTooltipStyle}
            labelFormatter={(value) => dayjs(value).format('MM/DD HH:mm')}
          />
          <Area
            name="LLM"
            dataKey="llm"
            stroke={ChartColors[0]}
            fill="url(#dashboard-call-fill)"
            strokeWidth={2.5}
          />
          <Area
            name="Embedding"
            dataKey="embedding"
            stroke={ChartColors[1]}
            fill="transparent"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FileDistribution({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  if (!data.file_types.length) return <EmptyChart />;
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-4">
      <div className="relative h-52 w-full max-w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.file_types}
              dataKey="count"
              nameKey="name"
              innerRadius={65}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {data.file_types.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={ChartColors[index % ChartColors.length]}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={ChartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">
            {NumberFormat.format(data.documents)}
          </span>
          <span className="mt-1 text-xs text-text-secondary">
            {t('dashboard.documents')}
          </span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-3 sm:min-w-40 sm:flex-1">
        {data.file_types.map((item, index) => (
          <li
            key={item.name}
            className="flex min-w-0 items-center gap-2 text-xs"
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: ChartColors[index % ChartColors.length] }}
            />
            <span
              className="min-w-0 flex-1 truncate uppercase text-text-secondary"
              title={item.name}
            >
              {item.name || t('dashboard.other')}
            </span>
            <span className="tabular-nums">
              {NumberFormat.format(item.count)}
            </span>
            <span className="w-12 shrink-0 text-right text-text-secondary">
              {((item.count / Math.max(data.documents, 1)) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardContent({
  data,
  period,
}: {
  data: DashboardData;
  period: DashboardPeriod;
}) {
  const { t } = useTranslation();
  const number = (value: number) => NumberFormat.format(value);
  const storage =
    data.storage_bytes < 1024 * 1024 * 1024
      ? `${(data.storage_bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${(data.storage_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label={t('dashboard.knowledgeBases')}
          value={number(data.knowledge_bases)}
          icon={Database}
          hint={t('dashboard.currentInventory')}
        />
        <Metric
          label={t('dashboard.documents')}
          value={number(data.documents)}
          icon={FileText}
          tone="teal"
          hint={t('dashboard.currentInventory')}
        />
        <Metric
          label={t('dashboard.conversations')}
          value={number(data.conversations)}
          icon={MessagesSquare}
          tone="purple"
          hint={t('dashboard.allTime')}
        />
        <Metric
          label={t('dashboard.messages')}
          value={number(data.messages)}
          icon={MessageSquare}
          tone="orange"
          hint={t('dashboard.allTime')}
        />
        <Metric
          label={t('dashboard.totalTokens')}
          value={CompactFormat.format(data.total_tokens)}
          icon={Coins}
          hint={t('dashboard.savedUsage')}
        />
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={t('dashboard.callTrend')}
          subtitle={t('dashboard.callScope')}
          icon={Activity}
          action={
            <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <i
                  className="size-2 rounded-full"
                  style={{ background: ChartColors[0] }}
                />
                LLM
              </span>
              <span className="flex items-center gap-1.5">
                <i
                  className="size-2 rounded-full"
                  style={{ background: ChartColors[1] }}
                />
                Embedding · {t('dashboard.notRecorded')}
              </span>
            </div>
          }
        >
          <CallTrend data={data} period={period} />
        </Panel>
        <Panel
          title={t('dashboard.assistantRanking')}
          subtitle={t('dashboard.assistantScope')}
          icon={MessagesSquare}
        >
          <Ranking rows={data.assistants} kind="assistant" />
        </Panel>
      </div>
      <Panel
        title={t('dashboard.knowledgeUsage')}
        subtitle={t('dashboard.knowledgeSubtitle')}
        icon={Database}
        action={
          <Button asLink to={Routes.Datasets} variant="outline" size="sm">
            {t('dashboard.manage')}
            <ArrowUpRight className="ml-1 size-3.5" />
          </Button>
        }
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Metric
            label={t('dashboard.knowledgeBases')}
            value={number(data.knowledge_bases)}
            icon={Database}
          />
          <Metric
            label={t('dashboard.files')}
            value={number(data.documents)}
            icon={FileText}
            tone="teal"
          />
          <Metric
            label={t('dashboard.storage')}
            value={storage}
            icon={HardDrive}
            tone="purple"
          />
        </div>
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <section className="min-w-0">
            <h3 className="text-sm font-medium">
              {t('dashboard.recallRanking')}
            </h3>
            <p className="mb-4 mt-1 text-xs text-text-secondary">
              {t('dashboard.recallScope')}
            </p>
            <Ranking rows={data.recall} kind="dataset" />
          </section>
          <section className="min-w-0 lg:border-l lg:border-border-button lg:pl-6">
            <h3 className="mb-3 text-sm font-medium">
              {t('dashboard.fileTypes')}
            </h3>
            <FileDistribution data={data} />
          </section>
        </div>
      </Panel>
      <Panel
        title={t('dashboard.tokenUsage')}
        subtitle={t('dashboard.tokenScope')}
        icon={Coins}
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label={t('dashboard.totalTokens')}
            value={number(data.total_tokens)}
            icon={Coins}
          />
          <Metric
            label={t('dashboard.inputTokens')}
            value={number(data.input_tokens)}
            icon={ArrowDownLeft}
            tone="cyan"
          />
          <Metric
            label={t('dashboard.outputTokens')}
            value={number(data.output_tokens)}
            icon={ArrowUpLeft}
            tone="purple"
          />
          <Metric
            label={t('dashboard.periodTokens')}
            value={number(data.period_tokens)}
            icon={BarChart3}
            tone="teal"
          />
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">{t('dashboard.dailyTokens')}</h3>
          <span className="text-xs text-text-secondary">
            {t('dashboard.last30Days')}
          </span>
        </div>
        {data.daily.some((point) => point.total > 0) ? (
          <div className="h-64 min-w-0" data-testid="token-trend">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.daily}
                margin={{ top: 5, left: -10, right: 8, bottom: 5 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border-button)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="time"
                  tickFormatter={(value) => dayjs(value).format('MM/DD')}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={26}
                  tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }}
                />
                <YAxis
                  tickFormatter={(value) => CompactFormat.format(value)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'rgb(var(--text-secondary))' }}
                />
                <Tooltip
                  contentStyle={ChartTooltipStyle}
                  labelFormatter={(value) => dayjs(value).format('YYYY/MM/DD')}
                />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                <Bar
                  name={t('dashboard.inputTokens')}
                  dataKey="input"
                  stackId="tokens"
                  fill="var(--dashboard-blue-soft)"
                  maxBarSize={28}
                />
                <Bar
                  name={t('dashboard.outputTokens')}
                  dataKey="output"
                  stackId="tokens"
                  fill={ChartColors[0]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  name={t('dashboard.unclassifiedLabel')}
                  dataKey="unclassified"
                  stackId="tokens"
                  fill="var(--dashboard-muted)"
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
        <p className="mt-4 border-t border-border-button pt-3 text-xs leading-relaxed text-text-secondary">
          {t('dashboard.usageNote')}
          {data.missing_usage > 0 &&
            ` ${t('dashboard.missingUsage', { count: data.missing_usage })}`}
          {data.unclassified_tokens > 0 &&
            ` ${t('dashboard.unclassified', { count: data.unclassified_tokens })}`}
        </p>
      </Panel>
    </>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<DashboardPeriod>('7d');
  const { data, isPending, isFetching, isError, refetch } =
    useDashboard(period);
  const changePeriod = (value: SegmentedValue) =>
    setPeriod(value as DashboardPeriod);
  const refresh = () => {
    void refetch();
  };
  const periodOptions = [
    { label: t('dashboard.period24h'), value: '24h' },
    { label: t('dashboard.period7d'), value: '7d' },
    { label: t('dashboard.period30d'), value: '30d' },
  ];
  return (
    <div
      className="h-full min-w-0 overflow-auto bg-bg-canvas p-4 lg:p-6"
      data-testid="home-dashboard"
    >
      <div className="mx-auto flex min-w-0 max-w-[1680px] flex-col gap-5">
        <header className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t('dashboard.title')}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreateButton asLink to={`${Routes.Datasets}?isCreate=true`}>
              {t('dashboard.newDataset')}
            </CreateButton>
            <CreateButton asLink to={`${Routes.Chats}?isCreate=true`}>
              {t('dashboard.newChat')}
            </CreateButton>
          </div>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            options={periodOptions}
            value={period}
            onChange={changePeriod}
            buttonSize="sm"
          />
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>
              {data
                ? `${t('dashboard.updated')} ${dayjs(data.updated_at).format('HH:mm')}`
                : t('dashboard.loading')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={refresh}
              disabled={isFetching}
              aria-label={t('dashboard.refresh')}
            >
              <RefreshCw
                className={cn('size-3.5', isFetching && 'animate-spin')}
              />
            </Button>
          </div>
        </div>
        {isPending ? (
          <div
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
            aria-busy="true"
            aria-label={t('dashboard.loading')}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-bg-base"
              />
            ))}
          </div>
        ) : isError ? (
          <Card role="alert" className="rounded-2xl p-8 text-center">
            <p className="mb-4 text-sm text-text-secondary">
              {t('dashboard.loadError')}
            </p>
            <Button variant="outline" onClick={refresh}>
              {t('dashboard.retry')}
            </Button>
          </Card>
        ) : (
          data && <DashboardContent data={data} period={period} />
        )}
      </div>
    </div>
  );
}
