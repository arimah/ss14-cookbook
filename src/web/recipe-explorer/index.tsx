import {
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ExploreFnContext,
  ExploreRecipeFn,
  ExploredRecipeContext,
} from './context';
import { RecipeExplorer } from './explorer';

export interface Props {
  children: ReactNode;
}

export const RecipeExplorerProvider = ({ children }: Props): ReactElement => {
  const [currentRecipe, setCurrentRecipe] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.toggle(
      'overlay-open',
      currentRecipe != null
    );
  }, [currentRecipe]);

  return (
    <ExploreFnContext.Provider value={setCurrentRecipe}>
      {children}
      {currentRecipe != null && (
        <ExploredRecipeContext.Provider value={currentRecipe}>
          <RecipeExplorer id={currentRecipe} setRecipe={setCurrentRecipe}/>
        </ExploredRecipeContext.Provider>
      )}
    </ExploreFnContext.Provider>
  );
};

export const useExploreRecipe = (): ExploreRecipeFn =>
  useContext(ExploreFnContext);

export const useCurrentExploredRecipe = (): string | null =>
  useContext(ExploredRecipeContext);
