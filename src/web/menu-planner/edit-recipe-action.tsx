import { ReactElement } from 'react';
import { AddIcon, RemoveRecipeIcon } from '../icons';
import { Tooltip } from '../tooltip';

export interface Props {
  id: string;
  isSelected?: boolean;
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const RecipeAction = ({
  id,
  isSelected = false,
  onAdd,
  onRemove,
}: Props): ReactElement => {
  return isSelected ? (
    <Tooltip text='Remove recipe from menu' provideLabel>
      <button onClick={() => onRemove?.(id)}>
        <RemoveRecipeIcon/>
      </button>
    </Tooltip>
  ) : (
    <Tooltip text='Add recipe to menu' provideLabel>
      <button onClick={() => onAdd?.(id)}>
        <AddIcon/>
      </button>
    </Tooltip>
  );
};
