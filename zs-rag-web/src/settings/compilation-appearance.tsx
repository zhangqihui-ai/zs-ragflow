import './compilation-avatar.css';

const appearances = new Map([
  ['knowledge_graph', { lines: ['Graph'], from: '#4f6dee', to: '#67bdf9' }],
  ['mind_map', { lines: ['Mind', 'map'], from: '#633897', to: '#cba1ff' }],
  ['page_index', { lines: ['Page', 'Index'], from: '#087f91', to: '#6acfd4' }],
  ['timeline', { lines: ['Time', 'line'], from: '#c35f2b', to: '#edb395' }],
  ['tree', { lines: ['Tree'], from: '#38a04d', to: '#93dca2' }],
  ['wiki', { lines: ['Wiki'], from: '#ad3770', to: '#f09bc2' }],
]);

const builtinAppearances = new Map([
  ['general', { title: 'General（通用）', initial: 'G', from: '#3659a1', to: '#83a6e8' }],
  ['qa', { title: 'Q&A（问答）', initial: 'Q', from: '#216a42', to: '#78c492' }],
  ['manual', { title: 'Manual（手册）', initial: 'M', from: '#4b4192', to: '#a6a0eb' }],
  ['table', { title: 'Table（表格）', initial: 'T', from: '#087785', to: '#66b9c3' }],
  ['paper', { title: 'Paper（论文）', initial: 'P', from: '#ad562e', to: '#e9a17c' }],
  ['book', { title: 'Book（书籍）', initial: 'B', from: '#168457', to: '#79d8a5' }],
  ['laws', { title: 'Laws（法规）', initial: 'L', from: '#78612c', to: '#c7a963' }],
  ['presentation', { title: 'Presentation（演示文稿）', initial: 'P', from: '#a13b63', to: '#e694b2' }],
  ['picture', { title: 'Picture（图片）', initial: 'P', from: '#185b72', to: '#66b6d1' }],
  ['one', { title: 'One（单段）', initial: 'O', from: '#526336', to: '#a9bf76' }],
  ['audio', { title: 'Audio（音频）', initial: 'A', from: '#713d8f', to: '#be8bd7' }],
  ['email', { title: 'Email（邮件）', initial: 'E', from: '#8e4146', to: '#d98b8e' }],
]);

export function builtinPipelineAppearance(id?: string) {
  return id ? builtinAppearances.get(id === 'naive' ? 'general' : id) : undefined;
}

export function compilationAppearance(kind: string) {
  return appearances.get(kind);
}

type PipelineAppearance = NonNullable<ReturnType<typeof compilationAppearance> | ReturnType<typeof builtinPipelineAppearance>>;

export function CompilationAvatar({ appearance }: { appearance: PipelineAppearance }) {
  const isInitial = 'initial' in appearance;
  return (
    <span
      aria-hidden="true"
      className={isInitial ? 'compilation-avatar compilation-avatar-initial' : 'compilation-avatar'}
      style={{ backgroundImage: `linear-gradient(to bottom, ${appearance.from}, ${appearance.to})` }}
    >
      {isInitial ? (
        <svg viewBox="-50 -50 100 100" preserveAspectRatio="xMinYMid meet">
          <text fontSize={55} fill="currentColor" textAnchor="middle" dominantBaseline="central">
            {appearance.initial}
          </text>
        </svg>
      ) : appearance.lines.map((line) => <span key={line}>{line}</span>)}
    </span>
  );
}
