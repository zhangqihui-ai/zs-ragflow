import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Routes } from '@/routes';
import { ChevronLeft, House } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

const LinkClassName =
  'rounded-sm text-text-secondary hover:text-nav-active-text focus-visible:text-nav-active-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active-text';

export function DatasetBreadcrumb() {
  const { t } = useTranslation();

  return (
    <Breadcrumb className="shrink-0 px-5 pt-3" data-testid="dataset-breadcrumb">
      <BreadcrumbList className="gap-2 text-base sm:gap-2">
        <BreadcrumbItem>
          <BreadcrumbLink asChild className={LinkClassName}>
            <Link
              to={Routes.Datasets}
              aria-label={t('knowledgeList.backToList')}
              title={t('knowledgeList.backToList')}
            >
              <ChevronLeft className="size-[18px]" aria-hidden="true" />
            </Link>
          </BreadcrumbLink>
          <BreadcrumbLink asChild className={LinkClassName}>
            <Link
              to={Routes.Root}
              aria-label={t('header.home')}
              title={t('header.home')}
            >
              <House className="size-[18px]" aria-hidden="true" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="text-text-disabled">
          /
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink
            asChild
            className={`${LinkClassName} font-medium text-text-primary`}
          >
            <Link to={Routes.Datasets}>{t('header.dataset')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
