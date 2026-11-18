import { CompilationTemplateKind } from '@/constants/compilation';
import type { TFunction } from 'i18next';

import { formatKindLabel } from '../compilation-template-util';

const labels: Record<string, string> = {
  'knowledgeCompilation.templateKindLabels.wiki': 'Wiki (百科)',
  'knowledgeCompilation.templateKindLabels.knowledge_graph': 'Graph (知识图谱)',
  'knowledgeCompilation.templateKindLabels.mind_map': 'Mindmap (思维导图)',
  'knowledgeCompilation.templateKindLabels.page_index': 'PageIndex (页面索引)',
  'knowledgeCompilation.templateKindLabels.timeline': 'Timeline (时间线)',
  'knowledgeCompilation.templateKindLabels.tree': 'Tree (目录树)',
  'knowledgeCompilation.graph': 'Graph',
};

function translate(table: Record<string, string>): TFunction {
  return ((key: string, options?: { defaultValue?: string }) => {
    if (key in table) {
      return table[key];
    }
    if (options && 'defaultValue' in options) {
      return options.defaultValue ?? '';
    }
    return key;
  }) as TFunction;
}

describe('formatKindLabel', () => {
  test('renders each template as English name plus Chinese translation', () => {
    const t = translate(labels);

    expect(formatKindLabel(t, CompilationTemplateKind.Artifacts)).toBe(
      'Wiki (百科)',
    );
    expect(formatKindLabel(t, CompilationTemplateKind.KnowledgeGraph)).toBe(
      'Graph (知识图谱)',
    );
    expect(formatKindLabel(t, CompilationTemplateKind.MindMap)).toBe(
      'Mindmap (思维导图)',
    );
    expect(formatKindLabel(t, CompilationTemplateKind.PageIndex)).toBe(
      'PageIndex (页面索引)',
    );
    expect(formatKindLabel(t, CompilationTemplateKind.Timeline)).toBe(
      'Timeline (时间线)',
    );
    expect(formatKindLabel(t, CompilationTemplateKind.Tree)).toBe(
      'Tree (目录树)',
    );
  });

  test('keeps the English label when a translation is absent', () => {
    const t = translate({ 'knowledgeCompilation.graph': 'Graph' });

    expect(formatKindLabel(t, CompilationTemplateKind.PageIndex)).toBe(
      'PageIndex',
    );
    expect(formatKindLabel(t, 'custom_kind')).toBe('Custom kind');
  });
});
