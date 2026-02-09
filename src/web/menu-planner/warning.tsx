import { ReactElement } from 'react';
import { useFork } from '../fork-context';
import { Notice } from '../notices';

export interface MenuWarningProps {
  menuFork: string;
  unavailableRecipeCount: number;
}

export const MenuWarning = ({
  menuFork,
  unavailableRecipeCount,
}: MenuWarningProps): ReactElement | null => {
  const { fork: currentFork, allForks } = useFork();

  if (menuFork === currentFork && unavailableRecipeCount === 0) {
    return null;
  }

  const targetMenuFork = allForks.find(f => f.id === menuFork);

  return (
    <Notice kind='warning'>
      <p>
        {menuFork !== currentFork &&
          `This menu was made for a different fork (${
            targetMenuFork?.name ?? 'not available'
          }). Recipes and ingredients may be different. `}
        {unavailableRecipeCount
          ? unavailableRecipeWarning(unavailableRecipeCount)
          : ''}
      </p>
    </Notice>
  );
};

const unavailableRecipeWarning = (count: number) =>
  `${count} recipe${count > 1 ? 's are' : ' is'} unavailable.`;
