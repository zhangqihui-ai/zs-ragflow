declare module '@/pages/user-setting/*' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/components/theme-provider' {
  export const ThemeProvider: import('react').ComponentType<import('react').PropsWithChildren<{ storageKey: string }>>;
  export function useTheme(): { setTheme: (theme: 'light' | 'dark', persist?: boolean) => void };
}
declare module '@/components/ui/tooltip' {
  export const TooltipProvider: import('react').ComponentType<import('react').PropsWithChildren>;
}
declare module '@/components/ui/sonner' {
  export const Toaster: import('react').ComponentType<{ position: 'top-right'; expand?: boolean; closeButton?: boolean }>;
}
declare module '@/components/ui/toaster' {
  export const Toaster: import('react').ComponentType;
}
declare module '@/constants/common' {
  export const ThemeEnum: { Light: 'light'; Dark: 'dark' };
}
declare module '@/locales/config' {
  export function initLanguage(): Promise<void>;
}
declare module '@/ee/services/billingStatus' {
  export function fetchBillingStatus(): Promise<boolean>;
}
declare module '@legacy-auth' {
  export function getAuthorization(): string;
  export type CredentialStorage = {
    getAuthorization: () => string;
    getUserInfoObject: () => unknown;
    setAuthorization: (value: string) => void;
    saveLoginCredentials: (value: { authorization: string; token: string; userInfo: string }) => void;
    removeAll: () => void;
  };
  const storage: CredentialStorage;
  export const adminStorage: CredentialStorage;
  export default storage;
}
declare module '@/pages/dataset/dataset' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/dataset/setting' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/chunk/*' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/document-viewer' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/hooks/use-knowledge-request' {
  export function useFetchKnowledgeBaseConfiguration(): {
    data: { id: string; name: string; tenant_id?: string };
    loading: boolean;
  };
}
declare module '@/pages/agent/context' {
  export const OwnerTenantIdContext: import('react').Context<string>;
}
declare module '@/pages/dataset/contexts/knowledge-base-context' {
  export const KnowledgeBaseProvider: import('react').ComponentType<import('react').PropsWithChildren<{
    knowledgeBase: { id: string; name: string; tenant_id?: string };
    loading: boolean;
  }>>;
}
declare module '@/pages/dataset/*' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/components/artifact-force-graph/types' {
  export interface ArtifactGraphLink {
    source: string | ArtifactGraphNode;
    target: string | ArtifactGraphNode;
  }
  export interface ArtifactGraphNode {
    x?: number;
    y?: number;
    __color: string;
    __radius: number;
    __neighbors?: ArtifactGraphNode[];
    __links?: ArtifactGraphLink[];
  }
}
declare module '@/components/artifact-force-graph/node-label' {
  export function renderNodeLabel(
    node: import('@/components/artifact-force-graph/types').ArtifactGraphNode,
    ctx: CanvasRenderingContext2D,
    scale: number,
  ): void;
}
declare module '@/components/artifact-force-graph/node-style' {
  export const DefaultLinkWidth: number;
  export const HighlightLinkWidth: number;
}
declare module '@/components/artifact-force-graph/utils' {
  export function getBaseLinkColor(element: HTMLElement | null): string;
  export function withAlpha(color: string, alpha: number): string;
}
declare module '@/pages/files' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/skills' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/memories' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/memory' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/memory/*' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/next-chats' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/next-chats/*' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/next-searches' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/next-search' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/next-search/share' {
  const Component: import('react').ComponentType;
  export default Component;
}
declare module '@/pages/next-search/ragflow-logo' {
  export const RAGFlowLogo: import('react').ComponentType<{ showEmbedIcon?: boolean }>;
}

declare module '@/pages/agents' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/pages/agents/agent-templates' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/pages/agents/agent-log-page' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/pages/agent' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/pages/agent/explore' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/pages/agent/share' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/pages/builtin-pipeline' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/pages/dataflow-result' {
  const Component: import('react').ComponentType;
  export default Component;
}

declare module '@/hooks/use-user-setting-request' {
  export function useFetchUserInfo(): { data: { id?: string; nickname?: string; email?: string } };
}

declare module '@/hooks/use-dataset-nav-request' {
  export function useFetchDatasetNav(): { data?: { total: number } };
}

declare module '@/hooks/use-knowledge-request' {
  export function useFetchArtifactTopicList(): { topics: unknown[] };
  export function useFetchDatasetStructureGraph(kind: string): {
    data?: { total_entities?: number; templates?: { entities?: unknown[]; relations?: unknown[] }[] } | null;
  };
}

declare module '@/components/ragflow-avatar' {
  export const RAGFlowAvatar: import('react').ComponentType<
    import('react').HTMLAttributes<HTMLSpanElement> & { name?: string; avatar?: string }
  >;
}
