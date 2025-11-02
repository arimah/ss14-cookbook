import {ReactElement} from 'react';

import {Tooltip} from '../tooltip';
import {AddIcon, RemoveRecipeIcon} from '../icons';

export interface Props {
  id: string;
  isSelected?: boolean;
  onAdd?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const RecipeAction = (props: Props): ReactElement => {
  const {id, isSelected = false, onAdd, onRemove} = props;
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
