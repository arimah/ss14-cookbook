import {ReactNode, useContext, useEffect, useState} from 'react'

import {
  ExploreRecipeFn,
  ExploreFnContext,
  ExploredRecipeContext,
} from './context';
import {RecipeExplorer} from './explorer';

export interface Props {
  children: ReactNode;
}

export const RecipeExplorerProvider = (props: Props): JSX.Element => {
  const {children} = props;

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
