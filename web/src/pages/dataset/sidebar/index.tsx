import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  LucideBookText,
  LucideFolderOpen,
  LucideLogs,
  LucideSettings,
  LucideTextSearch,
} from 'lucide-react';

import { RAGFlowAvatar } from '@/components/ragflow-avatar';
import { Button } from '@/components/ui/button';
import { useSecondPathName } from '@/hooks/route-hook';
import { cn, formatBytes } from '@/lib/utils';
import { Routes } from '@/routes';
import { formatPureDate } from '@/utils/date';

import { IDataset } from '@/interfaces/database/dataset';
import { useParams } from 'react-router';

type PropType = {
  refreshCount?: number;
  dataset: IDataset;
};

export function SideBar({ dataset: data }: PropType) {
  const pathName = useSecondPathName();
  const { id } = useParams();
  const { t } = useTranslation();

  const items = useMemo(() => {
    const list = [
      {
        icon: <LucideFolderOpen className="size-4" aria-hidden="true" />,
        label: t(`knowledgeDetails.subbarFiles`),
        key: Routes.Files,
      },
      {
        icon: <LucideTextSearch className="size-4" aria-hidden="true" />,
        label: t(`knowledgeDetails.testing`),
        key: Routes.DatasetTesting,
      },
      {
        icon: <LucideLogs className="size-4" aria-hidden="true" />,
        label: t(`knowledgeDetails.overview`),
        key: Routes.DataSetOverview,
      },
      {
        icon: <LucideSettings className="size-4" aria-hidden="true" />,
        label: t(`knowledgeDetails.configuration`),
        key: Routes.DataSetSetting,
      },
      {
        icon: <LucideBookText className="size-4" aria-hidden="true" />,
        label: 'Artifacts',
        key: Routes.Compilation,
      },
    ];

    return list;
  }, [t]);

  return (
    <aside className="navigation-sidebar flex flex-col w-64 relative">
      <header
        className="px-5 pb-4 grid grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-3"
        style={{
          gridTemplateAreas: '"avatar title" "avatar stats"',
        }}
      >
        <RAGFlowAvatar
          avatar={data.avatar}
          name={data.name}
          className="size-16"
          style={{ gridArea: 'avatar' }}
        />

        <h3
          className="text-lg font-semibold line-clamp-1 text-text-primary text-ellipsis overflow-hidden"
          style={{ gridArea: 'title' }}
        >
          {data.name}
        </h3>

        <div
          className="self-end text-text-secondary text-xs overflow-hidden"
          style={{ gridArea: 'stats' }}
        >
          <div className="flex justify-between">
            <span>
              {data.document_count} {t('knowledgeDetails.files')}
            </span>
            <span>{data.size ? formatBytes(data.size) : ''}</span>
          </div>

          <div className="mt-0.5">
            {t('knowledgeDetails.created')} {formatPureDate(data.create_time)}
          </div>
        </div>
      </header>

      <nav className="px-5 pt-1 pb-5 overflow-y-auto">
        <ul className="space-y-5">
          {items.map((item) => {
            const active = '/' + pathName === item.key;

            return (
              <li key={item.key}>
                <Button
                  asLink
                  block
                  variant="ghost"
                  className={cn(
                    'justify-start gap-2.5 px-3 relative h-10 rounded-xl text-base font-normal text-text-secondary',
                    active &&
                      '!bg-nav-active-bg !text-nav-active-text hover:!bg-nav-active-bg hover:!text-nav-active-text focus-visible:!bg-nav-active-bg focus-visible:!text-nav-active-text',
                  )}
                  aria-current={active ? 'page' : undefined}
                  to={`${Routes.DatasetBase}${item.key}/${id}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
