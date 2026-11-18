import { MoreButton } from '@/components/more-button';
import { TruncatedText } from '@/components/truncated-text';
import { Card } from '@/components/ui/card';
import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { useFetchBuiltinPipelines } from '@/hooks/use-agent-request';
import { useFetchPipelineVersionCatalog } from '@/hooks/use-pipeline-version-request';
import { resolveBuiltinParserId } from '@/hooks/use-parser-options';
import { IDataset } from '@/interfaces/database/dataset';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/date';
import { Database, FileText, ScanText, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { MouseEvent } from 'react';
import dayjs from 'dayjs';
import { Routes } from '@/routes';
import { DatasetDropdown } from './dataset-dropdown';
import useDuplicateDataset from '@/ee/pages/datasets/use-duplicate-dataset';
import { useRenameDataset } from './use-rename-dataset';

export type DatasetCardProps = {
  dataset: IDataset;
  showPrivilegeModal(): void;
} & Pick<ReturnType<typeof useRenameDataset>, 'showDatasetRenameModal'> & {
    showDatasetDuplicateModal: ReturnType<
      typeof useDuplicateDataset
    >['showModal'];
  };

export function DatasetCard({
  dataset,
  showDatasetRenameModal,
  showDatasetDuplicateModal,
  showPrivilegeModal,
}: DatasetCardProps) {
  const { t } = useTranslation();
  const { navigateToDataset } = useNavigatePage();
  const openDataset = navigateToDataset(dataset.id);
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as Element;
    if (
      !event.currentTarget.contains(target) ||
      target.closest('a, button, [role="menuitem"], [role="dialog"]')
    )
      return;
    openDataset();
  };
  const { options: parsers } = useFetchBuiltinPipelines();
  const { data: pipelines } = useFetchPipelineVersionCatalog(
    !!dataset.pipeline_id,
  );
  const parserId = resolveBuiltinParserId(
    dataset.parser_id || dataset.chunk_method || '',
  );
  const parser = dataset.pipeline_id
    ? pipelines?.find((item) => item.id === dataset.pipeline_id)?.name ||
      t('knowledgeList.cardPipeline')
    : parsers.find((item) => item.value === parserId)?.label ||
      parserId ||
      t('knowledgeList.cardNotConfigured');
  const model =
    dataset.embedding_model_name ||
    dataset.embedding_model ||
    t('knowledgeList.cardNotConfigured');
  const summary = dataset.parsing_summary;
  const state = summary?.status;
  const stateLabel = t(`knowledgeList.cardStatus.${state || 'unknown'}`);
  const stateDescription = summary
    ? t('knowledgeList.cardStatusSummary', summary)
    : stateLabel;
  const created = dataset.create_time || dataset.create_date;
  const date = created ? dayjs(created) : null;
  const timestamp = date?.isValid()
    ? formatDate(created, 'YYYY/MM/DD HH:mm:ss')
    : '—';
  const description =
    dataset.description?.trim() || t('knowledgeList.cardNoDescription');
  const files = summary?.total ?? dataset.document_count ?? 0;

  return (
    <Card
      as="article"
      className="group relative flex min-h-[254px] min-w-0 cursor-pointer flex-col rounded-2xl border-border-button bg-bg-base p-4 shadow-none transition-shadow hover:shadow-md"
      onClick={handleCardClick}
      data-testid="dataset-card"
      data-dataset-id={dataset.id}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-nav-active-text text-bg-base">
          <Database className="size-[18px] stroke-[1.7]" />
        </span>
        <DatasetDropdown
          dataset={dataset}
          showDatasetRenameModal={showDatasetRenameModal}
          showDatasetDuplicateModal={showDatasetDuplicateModal}
          showPrivilegeModal={showPrivilegeModal}
        >
          <MoreButton
            className="z-10 size-7 rounded-lg border border-border-button bg-bg-base opacity-100 group-hover:bg-bg-card"
            aria-label={t('knowledgeList.cardActions')}
          />
        </DatasetDropdown>
      </div>
      <Link
        to={`${Routes.Dataset}/${dataset.id}`}
        className="min-w-0 rounded text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active-text"
        aria-label={dataset.name}
      >
        <TruncatedText
          as="h3"
          className="truncate text-base font-semibold"
          tooltip={dataset.name}
        >
          {dataset.name}
        </TruncatedText>
      </Link>
      <p
        className="mt-1.5 min-h-10 break-words text-xs leading-5 text-text-secondary line-clamp-2"
        title={description}
      >
        {description}
      </p>
      <div className="mt-3 flex min-w-0 flex-col items-start gap-2">
        <span
          className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md border border-nav-active-text/20 bg-nav-active-bg px-2 py-1 text-xs text-nav-active-text"
          title={`${t('knowledgeList.cardEmbedding')}: ${model}`}
        >
          <Cpu className="size-3 shrink-0" />
          <TruncatedText as="span" className="min-w-0 truncate" tooltip={model}>
            {model}
          </TruncatedText>
        </span>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <span
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-nav-active-text/20 bg-nav-active-bg px-2 py-1 text-xs text-nav-active-text"
            title={`${t('knowledgeList.cardParser')}: ${parser}`}
          >
            <ScanText className="size-3 shrink-0" />
            <TruncatedText
              as="span"
              className="min-w-0 truncate"
              tooltip={parser}
            >
              {parser}
            </TruncatedText>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-text-secondary">
            <FileText className="size-3" />
            {t('knowledgeList.cardFiles', { count: files })}
          </span>
        </div>
      </div>
      <footer className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2 pt-4">
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium',
            state === 'ready'
              ? 'bg-state-success/10 text-state-success'
              : state === 'running'
                ? 'bg-nav-active-bg text-nav-active-text'
                : state === 'failed'
                  ? 'bg-state-error/10 text-state-error'
                  : state === 'pending'
                    ? 'bg-state-warning/10 text-state-warning'
                    : 'bg-bg-card text-text-secondary',
          )}
          title={stateDescription}
          data-testid="dataset-status"
        >
          <span className="size-1.5 rounded-full bg-current" />
          {stateLabel}
        </span>
        <time
          className="min-w-0 truncate text-[11px] tabular-nums text-text-secondary"
          dateTime={date?.isValid() ? date.toISOString() : undefined}
          title={`${t('knowledgeList.cardCreated')}: ${timestamp}`}
        >
          {timestamp}
        </time>
      </footer>
    </Card>
  );
}
