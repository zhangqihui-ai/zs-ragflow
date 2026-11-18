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

import { LlmIcon } from '@/components/svg-icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SearchInput } from '@/components/ui/input';
import {
  useFetchAddedProviders,
  useFetchAvailableProviders,
} from '@/hooks/use-llm-request';
import { IAvailableProvider } from '@/interfaces/database/llm';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderGroups } from '../constants';

/**
 * Sidebar selection type for the right pane.
 * - 'default': show the system default models view.
 * - any string: a provider (LLM factory) name; show its instance list.
 */
export type SidebarSelection = 'default' | string;

interface SidebarProps {
  selection: SidebarSelection;
  onSelect: (v: SidebarSelection) => void;
}

/**
 * Left column of the v2 settings page.
 *
 * Layout (top -> bottom):
 *  1. "Default models" entry — highlighted when `selection === 'default'`,
 *     with a chevron on the right.
 *  2. "Available models" section header.
 *  3. Search input — case-insensitive filter over provider names.
 *  4. Scrollable list of available providers — clicking a row highlights
 *     it and triggers `onSelect(providerName)`. Providers that already
 *     have at least one configured instance show a green dot on the
 *     right.
 */
export function Sidebar({ selection, onSelect }: SidebarProps) {
  const { t } = useTranslation();
  const { data: providers } = useFetchAvailableProviders();
  const { data: addedProviders } = useFetchAddedProviders();
  const [search, setSearch] = useState('');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const searching = search.trim().length > 0;

  // Any provider present in `addedProviders` is treated as "added" and
  // sorted first in the list. We deliberately do NOT fetch each added
  // provider's instance list on mount — instance details are fetched
  // lazily by the right pane only when the user clicks a provider.
  const addedSet = useMemo(() => {
    return new Set(
      addedProviders.filter((p) => p.has_instance).map((p) => p.name),
    );
  }, [addedProviders]);

  const providerGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = q
      ? providers.filter((provider) => provider.name.toLowerCase().includes(q))
      : providers;
    const byName = new Map(
      visible.map((provider) => [provider.name, provider]),
    );
    const groupedNames = new Set<string>();
    const groups = ProviderGroups.map((group) => {
      const items = group.names.flatMap((name) => {
        const provider = byName.get(name);
        if (!provider) {
          return [];
        }
        groupedNames.add(provider.name);
        return [provider];
      });
      return { ...group, providers: items };
    }).filter((group) => group.providers.length > 0);
    const ungrouped = visible.filter(
      (provider) => !groupedNames.has(provider.name),
    );
    return { groups, ungrouped };
  }, [providers, search]);

  const handleGroupOpenChange = (groupId: string, open: boolean) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      if (open) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3 py-4 text-text-primary">
      <button
        type="button"
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors border border-border-button',
          selection === 'default'
            ? 'bg-bg-input text-text-primary'
            : 'text-text-secondary hover:bg-bg-input hover:text-text-primary',
        )}
        onClick={() => onSelect('default')}
        data-testid="sidebar-default-models"
      >
        <span className="font-medium">{t('setting.systemModelSettings')}</span>
        <ChevronRight className="size-4" />
      </button>

      <div className="text-base font-medium text-text-primary px-1">
        {t('setting.availableModels')}
      </div>

      <SearchInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('setting.search')}
        data-testid="sidebar-provider-search"
        className="w-full border-none"
      />

      <div className="flex flex-col gap-1 overflow-auto scrollbar-auto">
        {providerGroups.groups.map((group) => (
          <ProviderGroup
            key={group.id}
            id={group.id}
            label={t(group.labelKey)}
            providers={group.providers}
            collapsed={collapsedGroupIds.has(group.id)}
            forceExpanded={searching}
            selection={selection}
            addedSet={addedSet}
            onSelect={onSelect}
            onOpenChange={handleGroupOpenChange}
          />
        ))}
        {providerGroups.ungrouped.map((provider) => (
          <ProviderButton
            key={provider.name}
            provider={provider}
            active={selection === provider.name}
            added={addedSet.has(provider.name)}
            onSelect={onSelect}
          />
        ))}
        {providerGroups.groups.length === 0 &&
          providerGroups.ungrouped.length === 0 && (
            <div className="text-xs text-text-secondary px-3 py-2">
              {t('setting.empty')}
            </div>
          )}
      </div>
    </div>
  );
}

function ProviderGroup({
  id,
  label,
  providers,
  collapsed,
  forceExpanded,
  selection,
  addedSet,
  onSelect,
  onOpenChange,
}: {
  id: string;
  label: string;
  providers: IAvailableProvider[];
  collapsed: boolean;
  forceExpanded: boolean;
  selection: SidebarSelection;
  addedSet: Set<string>;
  onSelect: (name: string) => void;
  onOpenChange: (groupId: string, open: boolean) => void;
}) {
  const expanded = forceExpanded || !collapsed;

  const handleOpenChange = (open: boolean) => {
    onOpenChange(id, open);
  };

  return (
    <Collapsible
      open={expanded}
      onOpenChange={handleOpenChange}
      className="flex flex-col gap-1"
    >
      <CollapsibleTrigger
        className="flex w-full items-center gap-1.5 rounded-md px-3 pb-1 pt-3 text-left text-sm font-semibold text-text-primary hover:bg-bg-input"
        data-testid={`sidebar-provider-group-${id}`}
      >
        <ChevronRight
          className={cn(
            'size-4 shrink-0 transition-transform',
            expanded && 'rotate-90',
          )}
        />
        <span className="truncate">{label}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-1">
        {providers.map((provider) => (
          <ProviderButton
            key={provider.name}
            provider={provider}
            active={selection === provider.name}
            added={addedSet.has(provider.name)}
            onSelect={onSelect}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ProviderButton({
  provider,
  active,
  added,
  onSelect,
}: {
  provider: IAvailableProvider;
  active: boolean;
  added: boolean;
  onSelect: (name: string) => void;
}) {
  const handleClick = () => {
    onSelect(provider.name);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={`sidebar-provider-${provider.name}`}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
        active
          ? 'bg-bg-input text-text-primary'
          : 'text-text-secondary hover:bg-bg-input hover:text-text-primary',
      )}
    >
      <LlmIcon
        name={provider.name}
        width={24}
        height={24}
        imgClass="size-6 text-text-primary"
      />
      <span className="truncate text-sm flex-1">{provider.name}</span>
      {added && (
        <span
          aria-label="configured"
          className="size-2 rounded-full bg-state-success shrink-0"
          data-testid={`sidebar-provider-dot-${provider.name}`}
        />
      )}
    </button>
  );
}

export default Sidebar;
