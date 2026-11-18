/*
 *  Copyright 2026 The InfiniFlow Authors. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { LLMFactory } from '@/constants/llm';

export const ProviderGroups = [
  {
    id: 'domestic',
    labelKey: 'setting.providerGroupDomestic',
    names: [
      LLMFactory.TongYiQianWen,
      LLMFactory.ZhipuAI,
      LLMFactory.Moonshot,
      LLMFactory.DeepSeek,
      LLMFactory.VolcEngine,
      LLMFactory.MiniMax,
      LLMFactory.TencentHunYuan,
      LLMFactory.Xiaomi,
    ],
  },
  {
    id: 'foreign',
    labelKey: 'setting.providerGroupForeign',
    names: [
      LLMFactory.OpenAI,
      LLMFactory.Anthropic,
      LLMFactory.Gemini,
      LLMFactory.XAI,
    ],
  },
  {
    id: 'local',
    labelKey: 'setting.providerGroupLocal',
    names: [
      LLMFactory.Ollama,
      LLMFactory.VLLM,
      LLMFactory.Xinference,
      LLMFactory.GPUStack,
    ],
  },
  {
    id: 'document',
    labelKey: 'setting.providerGroupDocument',
    names: [
      LLMFactory.MinerU,
      LLMFactory.PaddleOCR,
      LLMFactory.PaddleOCRLocal,
      LLMFactory.OpenDataLoader,
      LLMFactory.SoMark,
    ],
  },
  {
    id: 'custom',
    labelKey: 'setting.providerGroupCustom',
    names: [LLMFactory.OpenAiAPICompatible],
  },
] as const;

export const BedrockRegionList = [
  'us-east-2',
  'us-east-1',
  'us-west-1',
  'us-west-2',
  'af-south-1',
  'ap-east-1',
  'ap-south-2',
  'ap-southeast-3',
  'ap-southeast-5',
  'ap-southeast-4',
  'ap-south-1',
  'ap-northeast-3',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-east-2',
  'ap-southeast-7',
  'ap-northeast-1',
  'ca-central-1',
  'ca-west-1',
  'cn-north-1',
  'cn-northwest-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-south-1',
  'eu-west-3',
  'eu-south-2',
  'eu-north-1',
  'eu-central-2',
  'il-central-1',
  'mx-central-1',
  'me-south-1',
  'me-central-1',
  'sa-east-1',
  'us-gov-east-1',
  'us-gov-west-1',
];
