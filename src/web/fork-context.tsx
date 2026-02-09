import {
  ReactElement,
  ReactNode,
  createContext,
  useContext,
  useMemo,
} from 'react';
import { ForkData } from '../types';

export interface ForkContextType {
  readonly fork: string;
  readonly allForks: readonly ForkData[];
  readonly setFork: (fork: string) => void;
}

const ForkContext = createContext<ForkContextType>({
  fork: '',
  allForks: [],
  setFork: () => {},
});

export interface ForkProviderProps {
  fork: string;
  allForks: readonly ForkData[];
  setFork: (fork: string) => void;
  children: ReactNode;
}

export const ForkProvider = ({
  fork,
  allForks,
  setFork,
  children,
}: ForkProviderProps): ReactElement => {
  const value = useMemo(() => ({
    fork,
    allForks,
    setFork,
  }), [fork, allForks, setFork]);
  return (
    <ForkContext.Provider value={value}>
      {children}
    </ForkContext.Provider>
  );
};

export const useFork = () => useContext(ForkContext);
