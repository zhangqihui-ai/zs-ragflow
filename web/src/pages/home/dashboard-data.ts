import request from '@/utils/next-request';
import { useQuery } from '@tanstack/react-query';

export type DashboardPeriod = '24h' | '7d' | '30d';
export type DashboardPoint = {
  time: string;
  llm: number;
  embedding: number | null;
  input: number;
  output: number;
  total: number;
  unclassified: number;
};
export type DashboardRank = { id: string; name: string; count: number };
export type DashboardData = {
  knowledge_bases: number;
  documents: number;
  conversations: number;
  messages: number;
  storage_bytes: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  unclassified_tokens: number;
  period_tokens: number;
  missing_usage: number;
  trend: DashboardPoint[];
  daily: DashboardPoint[];
  assistants: DashboardRank[];
  recall: DashboardRank[];
  file_types: { name: string; count: number }[];
  updated_at: string;
};
const DashboardKeys = {
  summary: (period: DashboardPeriod) => ['home-dashboard', period] as const,
};
export function useDashboard(period: DashboardPeriod) {
  return useQuery({
    queryKey: DashboardKeys.summary(period),
    queryFn: async (): Promise<DashboardData> => {
      const { data: response } = await request.get('/api/v1/system/dashboard', {
        params: { period },
      });
      if (response.code !== 0)
        throw new Error(response.message || 'Unable to load dashboard');
      return response.data;
    },
    staleTime: 60_000,
  });
}
