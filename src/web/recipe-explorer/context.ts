import { createContext } from 'react';

export type ExploreRecipeFn = (id: string) => void;

export const ExploreFnContext = createContext<ExploreRecipeFn>(() => {
  throw new Error('No recipe explorer context available');
});

export const ExploredRecipeContext = createContext<string | null>(null);
