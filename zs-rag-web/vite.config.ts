import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const original = resolve(root, '../web');
const requireOriginal = createRequire(resolve(original, 'package.json'));

function settingsRoutes(): Plugin {
  const file = resolve(original, 'src/routes.tsx');
  return {
    name: 'settings-route-constants',
    enforce: 'pre',
    transform(source, id) {
      if (id !== file) return;
      const start = source.indexOf('export enum Routes {');
      const end = source.indexOf('\n}', start);
      if (start < 0 || end < 0) throw new Error('Could not load original route constants');
      // The settings components need route names, while their router is provided by the settings entry.
      return source.slice(start, end + 2);
    },
  };
}

function workspaceLoading(): Plugin {
  const artifactLoading = resolve(original, 'src/pages/dataset/compilation/loading-card.tsx');
  const wikiDetail = resolve(original, 'src/pages/dataset/compilation/wiki-detail-editor-panel.tsx');
  const documentTable = resolve(original, 'src/pages/dataset/dataset/dataset-table.tsx');
  const documentChunks = resolve(original, 'src/pages/chunk/parsed-result/add-knowledge/components/knowledge-chunk/index.tsx');
  const chunkRepresentation = resolve(original, 'src/pages/chunk/representation/index.tsx');
  return {
    name: 'workspace-loading',
    enforce: 'pre',
    transform(source, id) {
      if (id === artifactLoading) return 'export function CompilationLoadingCard() { return null; }';
      if (id === wikiDetail) {
        return source
          .replace("import { Spin } from '@/components/ui/spin';\n", '')
          .replace(/\{loading && !displayedContent \? \([\s\S]*?\) : \(/, '{loading && !displayedContent ? null : (');
      }
      if (id === documentTable) {
        return source
          .replace('  documents,\n  pagination,', '  documents,\n  loading,\n  pagination,')
          .replace(') : (\n            <TableRow>', ') : !loading && (\n            <TableRow>');
      }
      if (id === documentChunks) {
        return source
          .replace("import { Spin } from '@/components/ui/spin';\n", '')
          .replace('    loading,\n', '')
          .replace('<Spin spinning={loading} className="flex-1 h-0" size="large">', '<div className="relative flex-1 h-0">')
          .replace('</Spin>', '</div>');
      }
      if (id === chunkRepresentation) {
        return source
          .replace("import { SkeletonCard } from '@/components/skeleton-card';\n", '')
          .replace('      {loading && !data && <SkeletonCard className="mt-6" />}\n', '');
      }
    },
  };
}

function datasetLanguageDefaults(): Plugin {
  const setting = resolve(original, 'src/pages/dataset/setting');
  const parser = resolve(original, 'src/pages/agent/form/parser-form');
  return {
    name: 'dataset-language-defaults',
    enforce: 'pre',
    transform(source, id) {
      if (id === resolve(setting, 'index.tsx')) return source.replace("language: 'English'", "language: 'Chinese'");
      if (id === resolve(setting, 'hooks.ts')) {
        return source.replace("        'language',\n", '')
          .replace('      embedding_model: knowledgeDetails.embedding_model,',
            "      language: knowledgeDetails.language?.trim() || 'Chinese',\n      embedding_model: knowledgeDetails.embedding_model,");
      }
      if (id === resolve(setting, 'general-form.tsx')) {
        return source.replace('label: x,', "label: x === 'Chinese' ? '中文' : x,");
      }
      if (id === resolve(setting, 'parser-config.ts')) {
        return source.replace("import { Languages } from '@/components/cross-language-form-field';\n", '')
          .replace('next.lang = Languages[0];', "next.lang = 'Chinese';");
      }
      if (id === resolve(parser, 'use-set-initial-language.ts')) {
        return "import { useMatch } from 'react-router';\n" + source
          .replace('  const form = useFormContext();',
            "  const form = useFormContext();\n  const defaultLanguage = useMatch('/dataset/configuration/:id') ? 'Chinese' : Languages[0];")
          .replace('prefix), Languages[0],', 'prefix), defaultLanguage,')
          .replace('[form, lang, languageShown, prefix]', '[form, lang, languageShown, prefix, defaultLanguage]');
      }
      if (id === resolve(parser, 'common-form-fields.tsx')) {
        return "import { useMatch } from 'react-router';\n" + source
          .replace('  const crossLanguageOptions = useCrossLanguageOptions();',
            "  const crossLanguageOptions = useCrossLanguageOptions();\n  const inDatasetSettings = useMatch('/dataset/configuration/:id');")
          .replace('options={crossLanguageOptions}',
            "options={inDatasetSettings ? crossLanguageOptions.map((option) => option.value === 'Chinese' ? { ...option, label: '中文' } : option) : crossLanguageOptions}");
      }
    },
  };
}

function chatAssistantAvatar(): Plugin {
  const singleChat = resolve(original, 'src/pages/next-chats/chat/chat-box/single-chat-box.tsx');
  const multipleChat = resolve(original, 'src/pages/next-chats/chat/chat-box/next-multiple-chat-box.tsx');
  const sharedChat = resolve(original, 'src/pages/next-chats/share/index.tsx');
  const messageItem = resolve(original, 'src/components/message-item/index.tsx');
  const workflowChat = resolve(original, 'src/pages/agent/chat/box.tsx');
  const workflowMessageItem = resolve(original, 'src/components/next-message-item/index.tsx');
  const avatarPath = '/zs-assistant-avatar.png';
  const assistantAvatar = `avatarDialog="${avatarPath}"`;
  const brandedAvatar = `) : avatarDialog === '${avatarPath}' ? (
              <span className="chat-assistant-brand">
                <RAGFlowAvatar className="size-10 chat-assistant-icon" avatar={avatarDialog} isPerson />
                <span>Zs Bot</span>
              </span>
            ) :`;
  return {
    name: 'chat-assistant-avatar',
    enforce: 'pre',
    transform(source, id) {
      if (id === messageItem) {
        return source.replace(') : avatarDialog ? (', `${brandedAvatar} avatarDialog ? (`);
      }
      if (id === workflowMessageItem) {
        return source.replace(') : avatarDialog || agentName ? (', `${brandedAvatar} avatarDialog || agentName ? (`);
      }
      if (id === workflowChat) {
        return source
          .replace('const { data: canvasInfo, refetch } = useFetchAgent();', 'const { refetch } = useFetchAgent();')
          .replace('avatarDialog={canvasInfo.avatar}', assistantAvatar);
      }
      if (id === sharedChat) {
        return source
          .replace('  const avatarDialogSrc = chatInfo.avatar;\n', '')
          .replace('avatarDialog={avatarDialogSrc}', assistantAvatar);
      }
      if (id === singleChat || id === multipleChat) {
        const updated = source.replace('avatarDialog={currentDialog.icon}', assistantAvatar);
        return id === multipleChat ? updated : updated
          .replace('useFetchChat, useGetChatSearchParams', 'useGetChatSearchParams')
          .replace('  const { data: currentDialog } = useFetchChat();\n', '');
      }
    },
  };
}

function compilationWorkspace(): Plugin {
  const file = resolve(original, 'src/hooks/use-agent-request.ts');
  const agents = resolve(original, 'src/pages/agents/index.tsx');
  const compilationCard = resolve(original, 'src/pages/agents/compilation-template-card.tsx');
  const compilationAppearance = resolve(root, 'src/settings/compilation-appearance.tsx');
  const agentCard = resolve(original, 'src/pages/agents/agent-card.tsx');
  const homeCard = resolve(original, 'src/components/home-card.tsx');
  const builtinPipelineCard = resolve(original, 'src/pages/agents/builtin-pipeline-card.tsx');
  const chats = resolve(original, 'src/pages/next-chats/index.tsx');
  const chatRequests = resolve(original, 'src/hooks/use-chat-request.ts');
  const searches = resolve(original, 'src/pages/next-searches/index.tsx');
  const searchRequests = resolve(original, 'src/pages/next-searches/hooks.ts');
  const filter = resolve(root, 'src/settings/compilation-filter.tsx');
  const pipelineFilter = resolve(root, 'src/settings/pipeline-owner-filter.tsx');
  const editor = resolve(original, 'src/pages/user-setting/compilation-templates/edit-next/index.tsx');
  const artifacts = resolve(original, 'src/pages/dataset/compilation/index.tsx');
  const artifactTypes = resolve(root, 'src/settings/artifact-types.tsx');
  const routes = resolve(root, 'src/library-routes.ts');
  return {
    name: 'compilation-workspace',
    enforce: 'pre',
    transform(source, id) {
      if (id === artifacts) {
        return `import { ArtifactTypes, artifactTypeLabel } from ${JSON.stringify(artifactTypes)};\n`
          + source
            .replace('label: t(ViewModeLabelKeyMap[mode]),', 'label: artifactTypeLabel(mode) ?? t(ViewModeLabelKeyMap[mode]),')
            .replace('          <SelectWithSearch', '          <ArtifactTypes value={viewMode} onChange={handleViewModeChange} />\n          <SelectWithSearch');
      }
      if (id === searches) {
        return `import { SearchOwnerFilter } from ${JSON.stringify(pipelineFilter)};\n`
          + source
            .replace("icon=\"searches\"\n              title={t('searchApps')}", 'leftPanel={<SearchOwnerFilter />}')
            .replace('list?.data?.search_apps?.length || searchString ?', "list?.data?.search_apps?.length || searchString || searchUrl.has('search_owner') ?")
            .replace('data-testid="search-list"\n        >\n          <EmptyAppCard', 'data-testid="search-list"\n        >\n          <div className="absolute left-5 top-4"><SearchOwnerFilter /></div>\n          <EmptyAppCard');
      }
      if (id === searchRequests) {
        return source
          .replace('export const useFetchSearchList = () => {', "export const useFetchSearchList = () => {\n  const [searchParams] = useSearchParams();\n  const searchOwner = searchParams.get('search_owner');")
          .replace('        debouncedSearchString,\n        filterValue,', '        debouncedSearchString,\n        searchOwner,\n        filterValue,')
          .replace('owner_ids: filterValue.owner,', 'owner_ids: searchOwner ? [searchOwner] : filterValue.owner,');
      }
      if (id === chats) {
        return `import { ChatOwnerFilter } from ${JSON.stringify(pipelineFilter)};\n`
          + source
            .replace("import { Spin } from '@/components/ui/spin';\n", '')
            .replace('title={t(\'chat.chatApps\')}\n              icon="chats"', 'leftPanel={<ChatOwnerFilter />}')
            .replace(/\{loading && !data\?\.chats\?\.length \? \([\s\S]*?\) : data/, "{loading && !data?.chats?.length && !searchParams.has('chat_owner') ? null : data")
            .replace('data?.chats?.length || searchString ?', 'data?.chats?.length || searchString || searchParams.has(\'chat_owner\') ?')
            .replace('data-testid="chats-list"\n        >\n          <EmptyAppCard', 'data-testid="chats-list"\n        >\n          <div className="absolute left-5 top-4"><ChatOwnerFilter /></div>\n          <EmptyAppCard');
      }
      if (id === chatRequests) {
        return source
          .replace('export const useFetchChatList = () => {', "export const useFetchChatList = () => {\n  const [searchParams] = useSearchParams();\n  const chatOwner = searchParams.get('chat_owner');")
          .replace('        debouncedSearchString,\n        filterValue,', '        debouncedSearchString,\n        chatOwner,\n        filterValue,')
          .replace('owner_ids: filterValue.owner,', 'owner_ids: chatOwner ? [chatOwner] : filterValue.owner,');
      }
      if (id === homeCard) {
        return source
          .replace('  sharedBadge?: ReactNode;', '  sharedBadge?: ReactNode;\n  cardAvatar?: ReactNode;')
          .replace('  sharedBadge,', '  sharedBadge,\n  cardAvatar,')
          .replace('<RAGFlowAvatar', '{cardAvatar ?? <RAGFlowAvatar')
          .replace('name={data.name}\n        />', 'name={data.name}\n        />}');
      }
      if (id === builtinPipelineCard) {
        return `import { CompilationAvatar, builtinPipelineAppearance } from ${JSON.stringify(compilationAppearance)};\n`
          + source
            .replace('  const { t } = useTranslation();', '  const { t } = useTranslation();\n  const appearance = builtinPipelineAppearance(data.id);')
            .replace("name: data.title ?? '',", "name: appearance?.title ?? data.title ?? '',")
            .replace('testId="builtin-pipeline-card"',
              'testId="builtin-pipeline-card"\n      cardAvatar={appearance ? <CompilationAvatar appearance={appearance} /> : undefined}');
      }
      if (id === agentCard) {
        return `import { CompilationAvatar, compilationAppearance } from ${JSON.stringify(compilationAppearance)};\n`
          + source
            .replace('  data: IFlow;', '  data: IFlow & { compilation_kind?: string };')
            .replace('  const { navigateToAgent } = useNavigatePage();',
              '  const { navigateToAgent } = useNavigatePage();\n  const appearance = compilationAppearance(data.compilation_kind ?? "");')
            .replace('testId="agent-card"', 'testId="agent-card"\n      cardAvatar={appearance ? <CompilationAvatar appearance={appearance} /> : undefined}');
      }
      if (id === compilationCard) {
        return `import { CompilationAvatar, compilationAppearance } from ${JSON.stringify(compilationAppearance)};\n`
          + source
            .replace('  return (\n    <Card', `  const primaryAppearance = kinds.map(compilationAppearance).find(Boolean);

  return (
    <Card`)
            .replace('<RAGFlowAvatar', '{primaryAppearance ? <CompilationAvatar appearance={primaryAppearance} /> : <RAGFlowAvatar')
            .replace('className="w-8 h-8 shrink-0"\n        />', 'className="w-8 h-8 shrink-0"\n        />}');
      }
      if (id === agents) {
        return `import { CompilationFilter, isStandaloneCompiler } from ${JSON.stringify(filter)};\n`
          + `import { PipelineOwnerFilter, isStandalonePipeline, pipelineOwner } from ${JSON.stringify(pipelineFilter)};\n`
          + source
            .replace('const builtinVisible = shouldShowBuiltinForCategory(activeCategory);', 'const builtinVisible = !pipelineOwner(searchUrl) && shouldShowBuiltinForCategory(activeCategory);')
            .replace('leftPanel={\n              <AgentTabGroup', 'leftPanel={\n              isStandaloneCompiler(searchUrl) ? <CompilationFilter /> : isStandalonePipeline(searchUrl) ? <PipelineOwnerFilter /> : <AgentTabGroup');
      }
      if (id === editor) {
        return source
          .replace("import { resolveAgentsUrl } from './utils';", `import { compilationOperatorsHref } from ${JSON.stringify(routes)};`)
          .replace('useNavigate, useParams, useSearchParams', 'useNavigate, useParams')
          .replace("  const [searchParams] = useSearchParams();\n  const agentsUrl = resolveAgentsUrl(searchParams.get('source'));", '  const agentsUrl = compilationOperatorsHref;');
      }
      if (id !== file) return;
      const start = source.indexOf('export const useFetchAgentListByPage =');
      const end = source.indexOf('\nexport ', start + 1);
      const hook = source.slice(start, end);
      if (start < 0 || end < 0 || !hook.includes('queryFn: async () => {') || !hook.includes('canvasCategory,\n      filterValue,')) {
        throw new Error('Could not attach the compilation kind filter to the agent list');
      }
      const updated = hook
        .replace('  const { searchString', '  const [searchParams] = useSearchParams();\n  const kind = compilationKind(searchParams);\n  const { searchString')
        .replace('  const owner = filterValue.owner;', '  const ownPipelineId = pipelineOwner(searchParams);\n  const owner = ownPipelineId ? [ownPipelineId] : filterValue.owner;')
        .replace('      canvasCategory,\n      filterValue,', '      canvasCategory,\n      kind,\n      ownPipelineId,\n      filterValue,')
        .replace('queryFn: async () => {', `queryFn: async ({ signal }) => {
      if (kind) {
        return filterCompilationPage(kind, pagination.current, pagination.pageSize, async (page, pageSize) => {
          signal.throwIfAborted();
          const { data } = await agentService.listAgents({
            params: { ...requestParams, page, page_size: pageSize },
          }, true);
          if (data?.code !== 0 || !data.data) throw new Error(data?.message || '无法加载编译算子');
          return data.data;
        });
      }`);
      return `import { compilationKind, filterCompilationPage } from ${JSON.stringify(filter)};\n`
        + `import { pipelineOwner } from ${JSON.stringify(pipelineFilter)};\n`
        + source.slice(0, start) + updated + source.slice(end);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.DEV_API_TARGET || 'http://127.0.0.1:9380';
  const adminTarget = env.DEV_ADMIN_TARGET || 'http://127.0.0.1:9381';
  const tailwind = requireOriginal('tailwindcss');
  const { viteStaticCopy } = requireOriginal('vite-plugin-static-copy');
  const originalTailwind = requireOriginal('tailwindcss/loadConfig')(resolve(original, 'tailwind.config.js'));

  return {
    plugins: [
      settingsRoutes(),
      workspaceLoading(),
      datasetLanguageDefaults(),
      chatAssistantAvatar(),
      compilationWorkspace(),
      react(),
      viteStaticCopy({
        targets: [
          { src: resolve(original, 'public/iconfont.js'), dest: '.' },
          { src: resolve(original, 'node_modules/monaco-editor/min/vs'), dest: '.' },
          { src: resolve(original, 'public/pdfjs-dist/pdf.worker.min.js'), dest: 'pdfjs-dist' },
          { src: resolve(original, 'node_modules/pdfjs-dist/cmaps'), dest: 'pdfjs-dist' },
          { src: resolve(original, 'node_modules/pdfjs-dist/standard_fonts'), dest: 'pdfjs-dist' },
        ],
      }),
    ],
    resolve: {
      alias: [
        { find: './ragflow-logo', replacement: resolve(root, 'src/settings/search-wordmark.tsx') },
        { find: './use-graph-highlight', replacement: resolve(root, 'src/settings/use-artifact-graph-highlight.ts') },
        { find: '@/utils/authorization-util', replacement: resolve(root, 'src/settings/authorization.ts') },
        { find: '@legacy-auth', replacement: resolve(original, 'src/utils/authorization-util.ts') },
        { find: '@', replacement: resolve(original, 'src') },
        { find: '@legacy', replacement: original },
        { find: '@parent', replacement: resolve(original, '..') },
        ...['@tanstack/react-query', 'react-router', 'dayjs'].map((name) => ({
          find: name,
          replacement: resolve(original, 'node_modules', name),
        })),
      ],
      dedupe: ['react', 'react-dom'],
    },
    css: {
      modules: { localsConvention: 'camelCase' },
      postcss: {
        plugins: [tailwind({
          ...originalTailwind,
          content: originalTailwind.content.map((pattern: string) => resolve(original, pattern)),
        }), requireOriginal('autoprefixer')()],
      },
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          additionalData: '@import "@/less/variable.less";\n@import "@/less/mixins.less";\n',
          modifyVars: { hack: 'true; @import "@/less/index.less";' },
        },
      },
    },
    build: { rollupOptions: { input: [resolve(root, 'index.html'), resolve(root, 'settings-content.html')] } },
    server: {
      fs: { allow: [root, original, resolve(root, '../docs/references')] },
      watch: { usePolling: env.DEV_USE_POLLING === 'true', ignored: ['**/reference/paperclip/snapshot/**'] },
      proxy: {
        '/api/v1/admin': { target: adminTarget, changeOrigin: true, ws: true },
        '/api': { target: apiTarget, changeOrigin: true, ws: true },
        '/v1': { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
  };
});
