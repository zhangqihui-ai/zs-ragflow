const builtinFieldLabels: Record<string, string> = {
  person: '人物',
  org: '组织',
  product: '产品',
  regulation: '法规',
  location: '地点',
  system: '系统',
  equipment: '设备',
  other: '其他',
  owns: '拥有',
  part_of: '组成',
  caused_by: '由所致',
  regulates: '监管',
  located_in: '位于',
  uses: '使用',
  central_topic: '中心主题',
  branch: '分支',
  sub_branch: '子分支',
  keyword: '关键词',
  has_branch: '包含分支',
  has_sub_branch: '包含子分支',
  supports: '支撑',
  related_to: '相关',
  title: '标题',
  claim: '命题',
  include: '包含',
  timestamp: '时间',
  event: '事件',
  ordered: '时序',
  'A natural person (individual human).': '自然人（个人）。',
  'Organization, company, institution, agency, or any collective group.':
    '组织、公司、机构、部门或任何集体。',
  'Tangible or intangible product, service, software, or offering.':
    '有形或无形的产品、服务、软件或供给物。',
  'Law, policy, standard, guideline, or regulatory document.':
    '法律、政策、标准、指南或规范性文件。',
  'Geographic place (country, city, address, region, natural feature).':
    '地理位置（国家、城市、地址、区域或自然地貌）。',
  'Entities that do not fit any above category.': '不属于以上任何类别的实体。',
  'Technical system, platform, framework, or infrastructure.':
    '技术系统、平台、框架或基础设施。',
  'Physical device, machinery, hardware, or tool.':
    '物理设备、机械、硬件或工具。',
  'Ownership or possession (legal or de facto).':
    '所有权或占有关系（法律上或事实上）。',
  'Mereological relation — component to whole.': '部分与整体的组成关系。',
  'Causal relation — event, action, or state leads to another.':
    '因果关系，一个事件、行为或状态导致另一个。',
  'Regulatory or governing relation (law/standard controls entity).':
    '监管或约束关系（法律或标准约束实体）。',
  'Utilization — an entity employs or consumes another entity.':
    '使用关系，一个实体使用或消耗另一个实体。',
  'Spatial containment — entity situated inside a location.':
    '空间包含关系，实体位于某个地点之内。',
  'Any meaningful relation not covered by the above types.':
    '以上类型未覆盖的其他有意义关系。',
  'The main idea, goal, problem, or subject placed at the center of the mind map.':
    '放在思维导图中心的主题、目标、问题或对象。',
  'A major theme, category, or dimension radiating from the central topic.':
    '从中心主题延伸出的主要主题、类别或维度。',
  'A specific detail, task, supporting concept, example, or item under a branch.':
    '分支下的具体细节、任务、支撑概念、示例或条目。',
  'A compact supporting word or phrase that clarifies a branch or sub-branch.':
    '用来说明分支或子分支的简短词语。',
  'The central topic contains a major branch.': '中心主题包含一个主要分支。',
  'A branch or sub-branch contains a more specific child concept.':
    '分支或子分支包含更具体的下级概念。',
  'A keyword, example, task, or detail supports a parent concept.':
    '关键词、示例、任务或细节支撑上级概念。',
  'A cross-link between two concepts that are associated but not parent-child.':
    '两个相关但非父子关系的概念之间的横向关联。',
  'the heading text (clean, no page numbers or leader dots)':
    '标题文本（去掉页码和引导点）。',
  'an atomic, source-grounded proposition belonging to a title: a factual assertion, or a source-supported finding, outcome or conclusion. It is the same object the tree compiler calls a claim — an atomic proposition plus the verbatim evidence that grounds it.':
    '属于某个标题的原子命题：事实断言，或有来源支撑的发现、结果或结论，并附逐字证据。',
  'Upper-level title includes lower-level title.': '上级标题包含下级标题。',
  'the date or time reference (clean, no extraneous text)':
    '日期或时间（去掉多余文字）。',
  'the event description associated with the timestamp (concise, no metadata)':
    '与该时间对应的事件描述（简洁，不含元数据）。',
  'Events are arranged in strict chronological order (earliest to latest).':
    '事件按严格时间顺序排列（从早到晚）。',
  "A complete factual sentence stated in the source. Any sentence of the form 'X is Y', 'X has Y', 'X does Y', 'X was founded in Y', 'X is located in Y', 'X reported Y', etc. is a claim. Aim for at least 1-3 claims per entity per chunk that mentions it.":
    '来源中的完整事实句。形如“X 是 Y”“X 拥有 Y”“X 做了 Y”的句子都算命题。每个被提及的实体，每个分块至少提取 1 到 3 条。',
  'Entity/concept this claim is about (must match one of the entity/concept names extracted above).':
    '该命题所属的实体或概念（必须与上面提取的名称一致）。',
  "Concept name OR a thematic section topic (prefer the source's heading wording when coherent).":
    '概念名称，或一个主题小节标题（优先使用来源中的标题措辞）。',
  'Verbatim or near-verbatim defining phrase from the chunk.':
    '分块中逐字或接近逐字的定义短语。',
};

export function formatBuiltinFieldText(
  text: string | undefined,
  language: string,
): string | undefined {
  if (!text || !language.toLowerCase().startsWith('zh')) {
    return text;
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  const chinese = builtinFieldLabels[normalized];
  if (!chinese || normalized.includes(`(${chinese})`)) {
    return normalized;
  }
  return `${normalized} (${chinese})`;
}
