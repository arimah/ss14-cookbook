import { cloneElement, ReactElement, Ref } from 'react';
import { Popup, usePopupTrigger } from '../popup';
import { Recipe } from './recipe';

export interface Props {
  id: string | readonly string[];
  children: ReactElement<{
    ref?: Ref<HTMLElement>
  }>;
}

export const RecipePopup = ({ id, children }: Props): ReactElement => {
  const popup = usePopupTrigger();

  const childWithRef = cloneElement(children, {
    ref: popup.triggerRef,
  });

  return <>
    {childWithRef}
    <Popup
      {...popup}
      placement='below'
      interactive
    >
      <div className='popup_recipe'>
        {typeof id === 'string' ? renderRecipe(id) : id.map(renderRecipe)}
      </div>
    </Popup>
  </>;
};

const renderRecipe = (id: string): ReactElement =>
  <Recipe
    key={id}
    id={id}
    canExplore={false}
    canFavorite={false}
    skipDefaultHeaderAction
  />;
