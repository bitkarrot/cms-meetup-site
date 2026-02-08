import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/hooks/useTheme';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useAdminAuth } from '@/hooks/useRemoteNostrJson';
import { useSchedulerHealth } from '@/hooks/useSchedulerHealth';
import {
  LayoutDashboard,
  FileText,
  FileCode,
  Calendar,
  Settings,
  Home,
  Menu,
  X,
  Sun,
  Moon,
  Shield,
  Rss,
  Zap,
  FileImage,
  MessageCircle,
  HelpCircle,
  Clock,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });

  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const { isAdmin } = useAdminAuth(user?.pubkey);
  const { data: isSchedulerHealthy } = useSchedulerHealth();

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('adminSidebarCollapsed', String(newState));
  };

  const readOnlyEnabled = config.siteConfig?.readOnlyAdminAccess ?? false;
  const masterPubkey = (import.meta.env.VITE_MASTER_PUBKEY || '').toLowerCase().trim();
  const isMasterUser = user?.pubkey.toLowerCase().trim() === masterPubkey;
  const canAccessSettings = isMasterUser || (isAdmin && readOnlyEnabled);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Notes', href: '/admin/notes', icon: MessageCircle },
    { name: 'Blog Posts', href: '/admin/blog', icon: FileText },
    ...(isSchedulerHealthy ? [{ name: 'Scheduled', href: '/admin/scheduled', icon: Clock }] : []),

    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Feed', href: '/admin/feed', icon: Rss },
    { name: 'Zaplytics', href: '/admin/zaplytics', icon: Zap },
    { name: 'Media', href: '/admin/media', icon: FileImage },
    { name: 'Pages', href: '/admin/pages', icon: FileCode },
    { name: 'Forms', href: '/admin/forms', icon: ClipboardList },
    { name: 'Sync Content', href: '/admin/sync-content', icon: RefreshCw },
    ...(canAccessSettings ? [
      { name: 'Site Settings', href: '/admin/settings', icon: Settings },
      { name: 'Admin Settings', href: '/admin/system-settings', icon: Shield }
    ] : []),
    { name: 'View Site', href: '/', icon: Home },
    { name: 'Help', href: '/admin/help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed left-0 top-0 h-full w-64 bg-card border-r">
          <div className="flex items-center justify-between p-6">
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="px-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:overflow-y-auto lg:bg-card lg:border-r transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:w-20" : "lg:w-64"
      )}>
        <div className={cn(
          "flex h-16 shrink-0 items-center px-6",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && <h2 className="text-lg font-semibold truncate">Admin Panel</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn("h-8 w-8 p-0", isCollapsed && "mx-auto")}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-colors h-10",
                  isCollapsed ? "justify-center px-0" : "px-3 gap-3",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-4 w-4", !isCollapsed && "shrink-0")} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "lg:pl-20" : "lg:pl-64"
      )}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold">
                {navigation.find(item => item.href === location.pathname)?.name || 'Admin'}
              </h1>
            </div>
            <div className="flex items-center gap-x-2 lg:gap-x-4">
              <Button
                variant="ghost"
                size="sm"
                asChild
                title="View Site"
              >
                <Link to="/">
                  <Home className="h-5 w-5" />
                </Link>
              </Button>

              {canAccessSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  title="Site Settings"
                >
                  <Link to="/admin/settings">
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
              )}

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <LoginArea />
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}