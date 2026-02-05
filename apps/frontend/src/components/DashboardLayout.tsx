import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { authService, UserProfile } from '@/lib/auth';
import { Home, Calendar, Mail, User, LogOut, Menu, X, ChevronDown, ChevronRight, Inbox, Send, FileText, ShieldAlert, Trash2, PenSquare } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  children?: NavItem[];
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const router = useRouterState();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mailExpanded, setMailExpanded] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const userProfile = await authService.getUserProfile();
      if (userProfile) {
        setProfile(userProfile);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate({ to: '/' } as any);
  };

  const getInitials = (name: string): string => {
    if (!name) return 'U';

    const nameParts = name.trim().split(/\s+/);

    if (nameParts.length === 1) {
      // If single name, take first two characters
      return nameParts[0].substring(0, 2).toUpperCase();
    }

    // Take first character of first name and first character of last name
    const firstInitial = nameParts[0][0];
    const lastInitial = nameParts[nameParts.length - 1][0];
    return (firstInitial + lastInitial).toUpperCase();
  };

  const currentPath = router.location.pathname;

  const navItems: NavItem[] = [
    {
      name: 'Home',
      path: '/dashboard',
      icon: Home,
    },
    {
      name: 'Mail',
      path: '/dashboard/mail',
      icon: Mail,
      children: [
        {
          name: 'Inbox',
          path: '/dashboard/mail/inbox',
          icon: Inbox,
        },
        {
          name: 'Drafts',
          path: '/dashboard/mail/drafts',
          icon: FileText,
        },
        {
          name: 'Sent Items',
          path: '/dashboard/mail/sent',
          icon: Send,
        },
        {
          name: 'Junk Email',
          path: '/dashboard/mail/junk',
          icon: ShieldAlert,
        },
        {
          name: 'Deleted',
          path: '/dashboard/mail/trash',
          icon: Trash2,
        },
      ],
    },
    {
      name: 'Calendar',
      path: '/dashboard/calendar',
      icon: Calendar,
    },
    {
      name: 'Profile',
      path: '/dashboard/profile',
      icon: User,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Outlook style */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-[#0078D4] transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="h-16 px-4 flex items-center gap-3 border-b border-blue-700">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white flex-shrink-0">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#0078D4] font-bold text-sm">
                  {profile ? getInitials(profile.displayName) : 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-sm truncate">
                {profile?.displayName || 'MeetFlow'}
              </h2>
              <p className="text-blue-100 text-xs truncate">{profile?.email}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/80 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Compose Button */}
          <div className="p-3">
            <button
              onClick={() => {
                navigate({ to: '/dashboard/mail/compose' } as any);
                setSidebarOpen(false);
              }}
              className="w-full bg-white text-[#0078D4] hover:bg-blue-50 font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <PenSquare className="h-4 w-4" />
              New Message
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const hasChildren = item.children && item.children.length > 0;
              const isMailItem = item.name === 'Mail';

              return (
                <div key={item.path}>
                  <button
                    onClick={() => {
                      if (hasChildren && isMailItem) {
                        setMailExpanded(!mailExpanded);
                      } else {
                        navigate({ to: item.path } as any);
                        setSidebarOpen(false);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative text-left
                      ${
                        active && !hasChildren
                          ? 'bg-[#106EBE] text-white'
                          : 'text-white hover:bg-[#106EBE]'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium flex-1">{item.name}</span>
                    {hasChildren && (
                      mailExpanded ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )
                    )}
                  </button>

                  {/* Children */}
                  {hasChildren && mailExpanded && (
                    <div className="ml-3 mt-1 space-y-1">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.path);
                        return (
                          <button
                            key={child.path}
                            onClick={() => {
                              navigate({ to: child.path } as any);
                              setSidebarOpen(false);
                            }}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
                              ${
                                childActive
                                  ? 'bg-[#106EBE] text-white'
                                  : 'text-white/90 hover:bg-[#106EBE] hover:text-white'
                              }
                            `}
                          >
                            <ChildIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{child.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-3 border-t border-blue-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-white hover:bg-[#106EBE] rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="lg:hidden h-14 bg-[#0078D4] flex items-center px-4 sticky top-0 z-10 shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white hover:bg-[#106EBE] p-2 rounded"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
              {profile?.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#0078D4] font-bold text-xs">
                  {profile ? getInitials(profile.displayName) : 'U'}
                </span>
              )}
            </div>
            <h1 className="text-white font-semibold">MeetFlow</h1>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
