import { produce } from 'immer';
import {
  ReactElement,
  ReactNode,
  createContext,
  useMemo,
  useState,
} from 'react';
import { NoticesKey, useStorage } from '../storage';
import { NoticeData } from '../types';

export interface Notices {
  all: readonly NoticeData[];
  isDismissed(id: string): boolean;
  dismiss(id: string): void;
}

interface NoticesData {
  readonly dismissed: readonly string[];
}

const EmptyData: NoticesData = {
  dismissed: [],
};

export const NoticesContext = createContext<Notices>({
  all: [],
  isDismissed: () => false,
  dismiss: () => {},
});

export interface NoticesProviderProps {
  all: readonly NoticeData[];
  children: ReactNode;
}

export const NoticesProvider = ({
  all,
  children,
}: NoticesProviderProps): ReactElement => {
  const storage = useStorage<NoticesData>(NoticesKey);
  const [dismissed, setDismissed] = useState(() => {
    const stored = storage.read(EmptyData);
    return new Set(stored.dismissed);
  });

  const value: Notices = useMemo(() => ({
    all,
    isDismissed: id => dismissed.has(id),
    dismiss: (id: string) => {
      if (!dismissed.has(id)) {
        const nextDismissed = produce(dismissed, draft => {
          draft.add(id);
        });
        storage.write({
          dismissed: Array.from(nextDismissed),
        });
        setDismissed(nextDismissed);
      }
    },
  }), [all, dismissed]);

  return (
    <NoticesContext.Provider value={value}>
      {children}
    </NoticesContext.Provider>
  );
};
