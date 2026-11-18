import {
  RootLayoutBanner,
  RootLayoutContent,
  useRootLayoutChrome,
} from '@/ee/layouts/root-layout-shell';
import { Outlet } from 'react-router';
import { SidebarNavbar } from './components/global-navbar';

export function RootLayoutContainer({ children }: React.PropsWithChildren) {
  const { containerRef, showHeader } = useRootLayoutChrome();

  return (
    <div
      className="grid size-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
      ref={containerRef}
    >
      <div>
        <RootLayoutBanner />
      </div>

      <div className="flex min-h-0 min-w-0 overflow-hidden">
        {showHeader && <SidebarNavbar />}
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout() {
  return (
    <RootLayoutContainer>
      <RootLayoutContent>
        <Outlet />
      </RootLayoutContent>
    </RootLayoutContainer>
  );
}
