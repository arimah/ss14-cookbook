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

  /**
   * Helper function that append serch parameters (a query string) to the end
   * of a URL. This function *assumes* the provided URL does not end with a
   * fragment (`#foo`). Normally it will be used with a value produced by the
   * URL generator.
   * @param url The URL to append a query string to. Must *not* end with a
   *        fragment.
   * @param query The query string to append. If passed as a `URLSearchParams`,
   *        the value is stringified; otherwise, if passed as a string, it is
   *        used exactly as passed, with no escaping of any kind.
   */
  withSearchParams(url: string, query: URLSearchParams | string): string;
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

    withSearchParams,
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
  return withSearchParams(url, `fork=${encodeURIComponent(fork)}`);
};

const withSearchParams = (
  url: string,
  query: URLSearchParams | string
): string => {
  query = String(query);
  if (!query) {
    return url;
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${query}`;
};

export const useUrl = (): UrlGenerator => {
  const context = useContext(UrlContext);
  if (!context) {
    throw new Error('No URL generator available');
  }
  return context;
};
