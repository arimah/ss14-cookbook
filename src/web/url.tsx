import {ReactNode, createContext, useContext, useMemo} from 'react';
import {useSearchParams} from 'react-router-dom';

export interface UrlGenerator {
  readonly recipes: string;

  readonly foodSequence: string;

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
    recipes: withFork('/', query),
    foodSequence: withFork('/combinations', query),
    menuList: withFork('/menu', query),
    menuNew: withFork('/menu/new', query),
    menuView: (id: string) => withFork(`/menu/${id}`, query),
    menuEdit: (id: string) => withFork(`/menu/${id}/edit`, query),
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
  return `${url}?fork=${encodeURIComponent(fork)}`;
};

export const useUrl = (): UrlGenerator => {
  const context = useContext(UrlContext);
  if (!context) {
    throw new Error('No URL generator available');
  }
  return context;
};
