import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useTheme } from '@/hooks/useTheme';
import { LoginArea } from '@/components/auth/LoginArea';
import { Settings, Menu, X, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

const defaultNavigation = [
  { name: 'Home', href: '/', isSubmenu: false },
  { name: 'Events', href: '/events', isSubmenu: false },
  { name: 'Blog', href: '/blog', isSubmenu: false },
  { name: 'About', href: '/about', isSubmenu: false },
  { name: 'Contact', href: '/contact', isSubmenu: false },
];

export default function Navigation() {
  const { config } = useAppContext();
  const { user } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const siteConfig = config.siteConfig;
  const configNavigation = config.navigation || defaultNavigation;

  const isActivePath = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="bg-background border-b sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              {siteConfig?.logo ? (
                <img src={siteConfig.logo} alt="Logo" className="h-8 w-auto" />
              ) : (
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                  {siteConfig?.title?.charAt(0) || 'M'}
                </div>
              )}
              {siteConfig?.title && (
                <span className="font-semibold text-lg hidden sm:block">{siteConfig.title}</span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {configNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {user && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Admin</span>
                </Link>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-2">Toggle Theme</span>
            </Button>
            
            <LoginArea className="hidden sm:flex" />
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="space-y-3">
              {configNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActivePath(item.href) ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}