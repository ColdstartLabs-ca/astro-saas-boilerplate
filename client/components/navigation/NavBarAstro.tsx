import { AuthProvider } from '@shared/types/authProviders.types';
import { LocaleSwitcher } from '@client/components/i18n/LocaleSwitcher';
import { CreditsDisplay } from '@client/components/stripe/CreditsDisplay';
import { Logo } from '@client/components/logo/Logo';
import { useClickOutside } from '@client/hooks/useClickOutside';
import { useModalStore } from '@client/store/modalStore';
import { useUserStore } from '@client/store/userStore';
import { DEFAULT_LOCALE } from '@src/i18n/config';
import { getTranslations } from '@src/i18n/utils';
import { Menu, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export function NavBarAstro(): JSX.Element {
  const t = useMemo(() => getTranslations('nav'), []);
  const { openAuthModal } = useModalStore();
  const { isAuthenticated, isLoading, user, signOut } = useUserStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  // Helper to generate localized URLs
  const localizedPath = (path: string) => {
    return DEFAULT_LOCALE === 'en' ? path : `/${DEFAULT_LOCALE}${path}`;
  };

  const handleAuthClick = () => {
    if (!isAuthenticated && openAuthModal) {
      openAuthModal('login');
    }
  };

  const handleChangePassword = () => {
    if (openAuthModal) {
      openAuthModal('changePassword');
    }
  };

  // Check if user is authenticated through email/password
  const isPasswordUser = user?.provider === AuthProvider.EMAIL;

  // Active page detection — must read pathname in useEffect to avoid SSR/hydration mismatch
  const [pathname, setPathname] = useState('');
  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);
  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/') return pathname === '/' || pathname === `/${DEFAULT_LOCALE}`;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-main/80 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href={localizedPath('/')}
          className="flex items-center cursor-pointer hover:opacity-90 transition-all active:scale-95 flex-shrink-0 drop-shadow-[0_2px_8px_rgba(34,197,94,0.3)]"
        >
          <Logo variant="full" />
        </a>

        <nav className="hidden lg:flex items-center gap-2 xl:gap-4 ml-6 xl:ml-10">
          <a
            href={localizedPath('/#comparison')}
            className="text-sm font-bold transition-colors pb-1 text-text-muted hover:text-white border-b-2 border-transparent"
          >
            {t('comparison')}
          </a>
          <a
            href={localizedPath('/pricing')}
            className={`text-sm font-bold transition-colors pb-1 ${isActive('/pricing') ? 'text-white border-b-2 border-accent' : 'text-text-muted hover:text-white border-b-2 border-transparent'}`}
          >
            {t('pricing')}
          </a>
          <a
            href={localizedPath('/#faq')}
            className="text-sm font-bold transition-colors pb-1 text-text-muted hover:text-white border-b-2 border-transparent"
          >
            {t('faq')}
          </a>
        </nav>

        <div className="flex items-center gap-2 lg:gap-3 xl:gap-4">
          <LocaleSwitcher />
          {isLoading ? (
            /* Real button markup with invisible text for pixel-perfect skeleton sizing */
            <div
              className="flex items-center gap-2 lg:gap-3 xl:gap-4 pointer-events-none"
              aria-hidden="true"
            >
              <div className="hidden xl:flex items-center gap-1.5 bg-white/5 animate-pulse px-2.5 py-1.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 opacity-0"></span>
                <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap opacity-0">
                  {t('freeCredits')}
                </span>
              </div>
              <span className="hidden xl:inline-flex items-center justify-center rounded-xl text-sm font-bold bg-white/5 animate-pulse h-10 px-3 py-2">
                <span className="opacity-0">{t('signIn')}</span>
              </span>
              <span className="inline-flex items-center justify-center rounded-xl text-sm font-black bg-white/5 animate-pulse h-10 px-3 sm:px-5 py-2">
                <span className="hidden sm:inline opacity-0">{t('getStartedFree')}</span>
                <span className="sm:hidden opacity-0">{t('getStarted')}</span>
              </span>
            </div>
          ) : !isAuthenticated ? (
            <>
              <div className="hidden xl:flex items-center gap-1.5 glass-strong px-2.5 py-1.5 rounded-full border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                <span className="text-[10px] font-black text-white/80 uppercase tracking-tighter whitespace-nowrap">
                  {t('freeCredits')}
                </span>
              </div>
              <button
                onClick={handleAuthClick}
                className="hidden xl:inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-text-muted hover:text-white hover:bg-white/5 h-10 px-3 py-2"
              >
                {t('signIn')}
              </button>
              <button
                onClick={() => openAuthModal?.('register')}
                className="inline-flex items-center justify-center rounded-xl text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gradient-cta shine-effect text-white shadow-lg shadow-accent/20 h-10 px-3 sm:px-5 py-2"
              >
                <span className="hidden sm:inline">{t('getStartedFree')}</span>
                <span className="sm:hidden">{t('getStarted')}</span>
              </button>
            </>
          ) : (
            <>
              <a
                href={localizedPath('/dashboard')}
                className={`hidden md:inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-10 px-4 ${isActive('/dashboard') ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
              >
                {t('dashboard')}
              </a>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-surface/10 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="max-w-[180px] truncate">{user?.email}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4 text-muted-foreground"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <ul className="p-2 shadow-2xl glass-dropdown rounded-2xl w-56 absolute top-full right-0 mt-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <li>
                      <div className="px-2 py-2 pointer-events-none">
                        <CreditsDisplay />
                      </div>
                    </li>
                    <li>
                      <a
                        href={localizedPath('/dashboard')}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {t('dashboard')}
                      </a>
                    </li>
                    <li>
                      <a
                        href={localizedPath('/dashboard/billing')}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {t('billing')}
                      </a>
                    </li>
                    <li>
                      <a
                        href={localizedPath('/dashboard/settings')}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {t('settings')}
                      </a>
                    </li>
                    <li>
                      <a
                        href={localizedPath('/dashboard/history')}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {t('history')}
                      </a>
                    </li>
                    <li>
                      <a
                        href={localizedPath('/help')}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {t('support')}
                      </a>
                    </li>
                    <li>
                      <a
                        href={localizedPath('/pricing')}
                        className="block px-4 py-2 text-sm text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {t('viewPlans')}
                      </a>
                    </li>
                    {isPasswordUser && (
                      <li>
                        <button
                          onClick={handleChangePassword}
                          className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          {t('changePassword')}
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        onClick={signOut}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                      >
                        {t('signOut')}
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            </>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-muted-foreground hover:text-white transition-colors"
            aria-label={t('toggleMenu')}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-surface">
          <nav className="flex flex-col px-4 py-4 space-y-2">
            {isAuthenticated && (
              <a
                href={localizedPath('/dashboard')}
                className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/dashboard') ? 'text-white bg-white/5' : 'text-muted-foreground hover:bg-surface/10 hover:text-white'}`}
              >
                {t('dashboard')}
              </a>
            )}
            <a
              href={localizedPath('/#comparison')}
              className="block px-4 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-surface/10 hover:text-white"
            >
              {t('comparison')}
            </a>
            <a
              href={localizedPath('/pricing')}
              className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive('/pricing') ? 'text-white bg-white/5' : 'text-muted-foreground hover:bg-surface/10 hover:text-white'}`}
            >
              {t('pricing')}
            </a>
            <a
              href={localizedPath('/#faq')}
              className="block px-4 py-2 text-sm font-medium rounded-lg transition-colors text-muted-foreground hover:bg-surface/10 hover:text-white"
            >
              {t('faq')}
            </a>
            {!isAuthenticated && (
              <>
                <div className="border-t border-border my-2 pt-2">
                  <button
                    onClick={handleAuthClick}
                    className="block w-full text-left px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface/10 hover:text-white rounded-lg transition-colors"
                  >
                    {t('signIn')}
                  </button>
                  <button
                    onClick={() => openAuthModal?.('register')}
                    className="block w-full mt-2 px-4 py-2 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-lg transition-all glow-blue"
                  >
                    {t('getStartedFree')}
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
