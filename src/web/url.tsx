import {ReactNode, createContext, useContext, useMemo} from 'react';
import {useSearchParams} from 'react-router-dom';

export interface UrlGenerator {
  readonly recipes: string;

  readonly menuList: string;
  readonly menuNew: string;
  menuView(id: string): string;
  menuEdit(id: string): string;
}

const UrlContext = createContext<UrlGenerator | null>(null);

export interface UrlProviderProps {
  children: ReactNode;
}

export const UrlProvider = (props: UrlProviderProps): JSX.Element => {
  const {children} = props;

  const [query] = useSearchParams();
  const urlGenerator = useMemo<UrlGenerator>(() => ({
    recipes: withQuery('/', query),
    menuList: withQuery('/menu', query),
    menuNew: withQuery('/menu/new', query),
    menuView: (id: string) => withQuery(`/menu/${id}`, query),
    menuEdit: (id: string) => withQuery(`/menu/${id}/edit`, query),
  }), [query]);

  return (
    <UrlContext.Provider value={urlGenerator}>
      {children}
    </UrlContext.Provider>
  );
};

const withQuery = (url: string, query: URLSearchParams): string => {
  if (query.size === 0) {
    return url;
  }
  return `${url}?${query.toString()}`;
};

export const useUrl = (): UrlGenerator => {
  const context = useContext(UrlContext);
  if (!context) {
    throw new Error('No URL generator available');
  }
  return context;
};
