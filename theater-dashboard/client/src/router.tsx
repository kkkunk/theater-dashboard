import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type RouterValue = { pathname: string; navigate: (path: string) => void };
const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const navigate = useCallback((path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState({}, '', path);
    setPathname(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside RouterProvider');
  return value;
}
