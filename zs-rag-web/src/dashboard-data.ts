import { useEffect, useState } from 'react';
import { api, ApiError, clearSession, readSession } from './session';

export type Period = '24h' | '7d' | '30d';

export const periods: { value: Period; label: string }[] = [
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
];

type Rank = { id: string; name: string; count: number };

export type Dashboard = {
  knowledge_bases: number;
  documents: number;
  conversations: number;
  messages: number;
  trend: { time: string; llm: number }[];
  file_types: { name: string; count: number }[];
  assistants: Rank[];
  recall: Rank[];
  storage_bytes: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  unclassified_tokens: number;
  period_tokens: number;
  missing_usage: number;
  updated_at: string;
  daily: { time: string; total: number; input: number; output: number; unclassified: number }[];
};

export type Dataset = {
  id: string;
  name: string;
  description?: string | null;
  document_count: number;
  update_time?: number;
  create_time?: number;
};

type DashboardState =
  | { status: 'loading' | 'error' | 'forbidden' }
  | { status: 'demo' | 'live'; summary: Dashboard; datasets: Dataset[] | null };

const day = 86_400_000;

function demoData(period: Period): DashboardState {
  const count = { '24h': 24, '7d': 7, '30d': 30 }[period];
  const step = period === '24h' ? day / 24 : day;
  const end = new Date();
  end.setMinutes(0, 0, 0);
  if (period !== '24h') end.setHours(0);
  const dailyCalls = [46, 72, 58, 95, 70, 114, 89, 51, 68, 91];
  const hourlyCalls = [2, 1, 1, 0, 1, 3, 4, 7, 9, 13, 12, 10, 7, 8, 12, 15, 13, 10, 9, 6, 4, 3, 2, 1];
  const calls = period === '24h' ? hourlyCalls : dailyCalls;

  const daily = Array.from({ length: 30 }, (_, index) => {
    const calls = dailyCalls[index % dailyCalls.length];
    return {
      time: new Date(end.getTime() - (29 - index) * day).toISOString(),
      input: calls * 720,
      output: calls * 180,
      unclassified: 0,
      total: calls * 900,
    };
  });

  return {
    status: 'demo',
    summary: {
      knowledge_bases: 12,
      documents: 826,
      conversations: 148,
      messages: 2453,
      storage_bytes: 360 * 1024 ** 2,
      updated_at: new Date().toISOString(),
      total_tokens: daily.reduce((sum, point) => sum + point.total, 0),
      input_tokens: daily.reduce((sum, point) => sum + point.input, 0),
      output_tokens: daily.reduce((sum, point) => sum + point.output, 0),
      unclassified_tokens: 0,
      missing_usage: 0,
      period_tokens: Array.from({ length: count }, (_, index) => calls[index % calls.length] * 900)
        .reduce((sum, tokens) => sum + tokens, 0),
      daily,
      recall: [
        { id: 'product', name: '产品文档', count: 84 },
        { id: 'engineering', name: '研发知识库', count: 42 },
      ],
      trend: Array.from({ length: count }, (_, index) => ({
        time: new Date(end.getTime() - (count - index - 1) * step).toISOString(),
        llm: calls[index % calls.length],
      })),
      file_types: [
        { name: 'pdf', count: 348 },
        { name: 'docx', count: 224 },
        { name: 'md', count: 148 },
        { name: 'xlsx', count: 70 },
        { name: '其他', count: 36 },
      ],
      assistants: [
        { id: 'support', name: '客户支持助手', count: 182 },
        { id: 'product', name: '产品知识助手', count: 136 },
        { id: 'team', name: '团队知识助手', count: 72 },
      ],
    },
    datasets: [
      { id: 'product', name: '产品文档', description: '功能说明、操作指南和版本记录', document_count: 186, update_time: end.getTime() },
      { id: 'engineering', name: '研发知识库', description: '技术规范、架构方案和开发手册', document_count: 142, update_time: end.getTime() - day },
      { id: 'support', name: '客户支持手册', description: '常见问题与标准服务流程', document_count: 98, update_time: end.getTime() - 2 * day },
    ],
  };
}

export function useDashboard(period: Period, enabled = true) {
  const [session, setSession] = useState(readSession);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; session: string; data: DashboardState }>();
  const key = period + '/' + revision;

  useEffect(() => {
    const syncSession = () => setSession(readSession());
    window.addEventListener('focus', syncSession);
    return () => window.removeEventListener('focus', syncSession);
  }, []);

  useEffect(() => {
    if (!session || !enabled) return;
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.all([
      api<Dashboard>('/api/v1/system/dashboard?period=' + period, { signal }, session),
      api<Dataset[]>('/api/v1/datasets?page=1&page_size=3&sort=update_time:desc', { signal }, session)
        .catch(() => null),
    ]).then(([summary, datasets]) => {
      if (signal.aborted) return;
      setResult({ key, session, data: { status: 'live', summary, datasets } });
    }).catch((reason) => {
      if (signal.aborted) return;
      const currentSession = readSession();
      if (currentSession !== session) {
        setSession(currentSession);
        return;
      }
      if (reason instanceof ApiError && reason.status === 401) {
        clearSession(session);
        window.location.replace('/login-next?expired=1');
        return;
      }
      const status = reason instanceof ApiError && reason.status === 403 ? 'forbidden' : 'error';
      setResult({ key, session, data: { status } });
    });
    return () => controller.abort();
  }, [key, period, session, enabled]);

  const refresh = () => {
    setSession(readSession());
    setRevision((value) => value + 1);
  };
  const data: DashboardState = !session
    ? demoData(period)
    : result?.key === key && result.session === session ? result.data : { status: 'loading' };

  return { data, refresh, hasSession: Boolean(session) };
}
