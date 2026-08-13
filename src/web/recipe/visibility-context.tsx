import {
  ReactElement,
  ReactNode,
  RefObject,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

interface VisibilityContextType {
  subscribe: (elem: HTMLElement, onEnter: () => void) => void;
  unsubscribe: (elem: HTMLElement) => void;
}

const VisibilityContext = createContext<VisibilityContextType | null>(
  null
);

export interface RecipeVisibilityProviderProps {
  children: ReactNode;
}

export const RecipeVisibilityProvider = ({
  children,
}: RecipeVisibilityProviderProps): ReactElement => {
  const [value] = useState<VisibilityContextType>(() => {
    const subs = new Map<HTMLElement, () => void>;
    const handleChange: IntersectionObserverCallback = entries => {
      for (const entry of entries) {
        const onEnter = subs.get(entry.target as HTMLElement);
        if (entry.isIntersecting && onEnter) {
          onEnter?.();
        }
      }
    };

    const observer = new IntersectionObserver(handleChange, {
      threshold: [0],
      rootMargin: '32px',
    });

    return {
      subscribe: (elem, onChange) => {
        subs.set(elem, onChange);
        observer.observe(elem);
      },
      unsubscribe: elem => {
        subs.delete(elem);
        observer.unobserve(elem);
      },
    };
  });

  return (
    <VisibilityContext.Provider value={value}>
      {children}
    </VisibilityContext.Provider>
  );
};

export const useRecipeVisibility = (
  ref: RefObject<HTMLElement | null>
): boolean => {
  const context = useContext(VisibilityContext);
  // Start invisible if there is an observer; otherwise, always visible.
  const [visible, setVisible] = useState(!context);

  useEffect(() => {
    const elem = ref.current;
    if (elem && context) {
      context.subscribe(elem, () => {
        setVisible(true);
        // We no longer need to track this element.
        context.unsubscribe(elem);
      });
      return () => context.unsubscribe(elem);
    }
    return undefined;
  }, [context]);

  return visible;
};
