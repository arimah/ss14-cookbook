import {
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useMemo,
} from 'react';
import { useSearchParams } from 'react-router';

export interface UrlGenerator {
  readonly recipes: string;

  readonly foodSequence: string;

  readonly menuList: string;
  readonly menuNew: string;
  menuView(id: string): string;
  menuEdit(id: string): string;
  menuImport(data: string): string;

  migrateExport: string;
  migrateImport(dataJson: string): string;
}

const UrlContext = createContext<UrlGenerator | null>(null);

export interface UrlProviderProps {
  children: ReactNode;
}

export const UrlProvider = ({ children }: UrlProviderProps): ReactElement => {
  const [query] = useSearchParams();
  const urlGenerator = useMemo<UrlGenerator>(() => ({
    recipes: withFork('/', query),

    foodSequence: withFork('/combinations', query),

    menuList: withFork('/menu', query),
    menuNew: withFork('/menu/new', query),
    menuView: id => withFork(`/menu/${id}`, query),
    menuEdit: id => withFork(`/menu/${id}/edit`, query),
    menuImport: data => withFork(
      `/menu?import=${encodeURIComponent(data)}`,
      query
    ),

    migrateExport: '/migrate?export',
    migrateImport: data =>
      `/migrate?import&data=${encodeURIComponent(data)}`,
  }), [query]);

  return (
    <UrlContext.Provider value={urlGenerator}>
      {children}
    </UrlContext.Provider>
  );
};

const withFork = (url: string, query: URLSearchParams): string => {
  const fork = query.get('fork');
  if (!fork) {
    return url;
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}fork=${encodeURIComponent(fork)}`;
};

export const useUrl = (): UrlGenerator => {
  const context = useContext(UrlContext);
  if (!context) {
    throw new Error('No URL generator available');
  }
  return context;
};
