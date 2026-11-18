import { Button } from '@/components/ui/button';
import { RAGFlowAvatar } from '@/components/ragflow-avatar';
import { appName } from '@/conf.json';
import { useFetchUserInfo } from '@/hooks/use-user-setting-request';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import {
  Brain,
  Database,
  FolderClosed,
  House,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

const PathMap = {
  [Routes.Datasets]: [Routes.Datasets, Routes.DatasetBase],
  [Routes.Chats]: [Routes.Chats, Routes.Chat],
  [Routes.Searches]: [Routes.Searches, Routes.Search],
  [Routes.Agents]: [Routes.Agents, Routes.AgentTemplates, Routes.Agent],
  [Routes.Memories]: [
    Routes.Memories,
    Routes.Memory,
    Routes.MemoryMessage,
    Routes.MemorySetting,
  ],
  [Routes.Files]: [Routes.Files],
} as const;

const matchesPath = (pathname: string, candidate: string) =>
  pathname === candidate || pathname.startsWith(`${candidate}/`);

const menuItems = [
  { path: Routes.Root, name: 'header.home', icon: House },
  { path: Routes.Datasets, name: 'header.dataset', icon: Database },
  {
    path: Routes.Chats,
    name: 'header.chat',
    icon: MessagesSquare,
    testId: 'nav-chat',
  },
  {
    path: Routes.Searches,
    name: 'header.search',
    icon: Search,
    testId: 'nav-search',
  },
  {
    path: Routes.Agents,
    name: 'header.flow',
    icon: Workflow,
    testId: 'nav-agent',
  },
  { path: Routes.Memories, name: 'header.memories', icon: Brain },
  { path: Routes.Files, name: 'header.fileManager', icon: FolderClosed },
];

function useActivePath() {
  const { pathname } = useLocation();
  return useMemo(
    () =>
      Object.keys(PathMap).find((path) =>
        PathMap[path as keyof typeof PathMap].some((candidate) =>
          matchesPath(pathname, candidate),
        ),
      ) || (pathname === Routes.Home ? Routes.Root : pathname),
    [pathname],
  );
}

const storageKey = 'ragflow-sidebar-collapsed';

const primaryNavItemClass =
  'flex h-12 min-w-0 items-center gap-3 rounded-xl px-3 text-lg font-normal text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active-text focus-visible:ring-inset';

const navActiveItemClass =
  '!bg-nav-active-bg !text-nav-active-text hover:!bg-nav-active-bg hover:!text-nav-active-text focus-visible:!bg-nav-active-bg focus-visible:!text-nav-active-text';

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: user } = useFetchUserInfo();
  const name = user.nickname || user.email || t('header.user');
  const role = user.id
    ? t(user.is_superuser ? 'header.administrator' : 'header.member')
    : '—';
  const settingsActive = [Routes.UserSetting, Routes.ProfileSetting].some(
    (path) => matchesPath(pathname, path),
  );

  return (
    <div
      className="shrink-0 border-t border-border-button p-2"
      data-testid="sidebar-footer"
    >
      <Link
        to={Routes.UserSetting}
        aria-label={t('header.settings')}
        aria-current={settingsActive ? 'page' : undefined}
        title={t('header.settings')}
        data-testid="settings-entrypoint"
        className={cn(
          primaryNavItemClass,
          collapsed && 'justify-center px-0',
          settingsActive && navActiveItemClass,
        )}
      >
        <Settings2
          className="size-5 shrink-0 stroke-[1.8]"
          aria-hidden="true"
        />
        <span className={collapsed ? 'sr-only' : 'truncate'}>
          {t('header.settings')}
        </span>
      </Link>
      <Link
        to={Routes.UserSetting}
        aria-label={`${name} · ${role}`}
        title={`${name} · ${role}`}
        data-testid="sidebar-user-info"
        className={cn(
          'mt-1 flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-text-primary transition-colors hover:bg-bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-active-text focus-visible:ring-inset',
          collapsed && 'justify-center px-0',
        )}
      >
        <RAGFlowAvatar
          name={name}
          avatar={user.avatar}
          isPerson
          className="size-8 shrink-0 rounded-full"
        />
        <div
          className={
            collapsed ? 'sr-only' : 'flex min-w-0 flex-1 flex-col gap-0.5'
          }
        >
          <span className="truncate text-sm font-medium" title={name}>
            {name}
          </span>
          <span className="truncate text-xs text-text-secondary" title={role}>
            {role}
          </span>
        </div>
      </Link>
    </div>
  );
}

export function SidebarNavbar() {
  const { t } = useTranslation();
  const activePath = useActivePath();
  const [collapsed, setCollapsed] = useState(() => {
    if (window.matchMedia('(max-width: 767px)').matches) return true;
    return localStorage.getItem(storageKey) === 'true';
  });

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => {
      if (media.matches) setCollapsed(true);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    setCollapsed((previous) => {
      localStorage.setItem(storageKey, String(!previous));
      return !previous;
    });
  };

  return (
    <aside
      className={cn(
        'navigation-sidebar flex h-full min-h-0 shrink-0 flex-col border-r border-border-button bg-bg-base transition-[width] duration-200 motion-reduce:transition-none',
        collapsed ? 'w-16' : 'w-44 md:w-56',
      )}
      data-testid="global-sidebar"
      data-collapsed={collapsed}
    >
      <div
        className={cn(
          'flex h-[72px] shrink-0 items-center',
          collapsed
            ? 'flex-col justify-center gap-1 px-2'
            : 'justify-between gap-2 px-3',
        )}
      >
        <Link
          to={Routes.Root}
          aria-label={appName}
          className="flex min-w-0 items-center gap-2"
          title={appName}
        >
          <img
            src="/zs-logo-bright.png"
            alt=""
            className="h-8 w-10 shrink-0 object-contain"
          />
          {!collapsed && (
            <span className="min-w-0 truncate text-lg font-semibold tracking-wide md:text-xl">
              {appName}
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={t(
            collapsed ? 'header.expandSidebar' : 'header.collapseSidebar',
          )}
          aria-expanded={!collapsed}
          aria-controls="global-navigation"
          title={t(
            collapsed ? 'header.expandSidebar' : 'header.collapseSidebar',
          )}
          className={cn('shrink-0', collapsed ? 'size-8' : 'size-9')}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
      </div>
      <nav
        id="global-navigation"
        aria-label={t('header.mainNavigation')}
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-4"
      >
        <ul className="space-y-2">
          {menuItems.map(({ path, name, icon: Icon, testId }) => {
            const active = activePath === path;
            return (
              <li key={path}>
                <Link
                  to={path}
                  data-testid={testId}
                  aria-label={t(name)}
                  aria-current={active ? 'page' : undefined}
                  title={t(name)}
                  className={cn(
                    primaryNavItemClass,
                    collapsed && 'justify-center px-0',
                    active && navActiveItemClass,
                  )}
                >
                  <Icon
                    className="size-5 shrink-0 stroke-[1.8]"
                    aria-hidden="true"
                  />
                  <span className={collapsed ? 'sr-only' : 'min-w-0 truncate'}>
                    {t(name)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
