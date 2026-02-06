import {ReactElement} from 'react';

import {Notice} from '../notices';
import {useFork} from '../fork-context';

export interface MenuWarningProps {
  menuFork: string;
  unavailableRecipeCount: number;
}

export const MenuWarning = (props: MenuWarningProps): ReactElement | null => {
  const {menuFork, unavailableRecipeCount} = props;

  const {fork: currentFork, allForks} = useFork();

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
