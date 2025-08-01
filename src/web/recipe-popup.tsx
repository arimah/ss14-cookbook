import {ReactElement, Ref, cloneElement} from 'react';
import {createPortal} from 'react-dom';

import {Recipe} from './recipe';
import {getPopupRoot, usePopupTrigger} from './popup-impl';

export interface Props {
  id: string | readonly string[];
  children: ReactElement<{
    ref?: Ref<HTMLElement>
  }>;
}

export const RecipePopup = (props: Props): JSX.Element => {
  const {id, children} = props;

  const {visible, popupRef, parentRef} = usePopupTrigger<HTMLDivElement>(
    'below'
  );

  const childWithRef = cloneElement(children, {
    ref: parentRef,
  });

  return <>
    {childWithRef}
    {visible && createPortal(
      <div className='popup popup--recipe' ref={popupRef}>
        {typeof id === 'string' ? renderRecipe(id) : id.map(renderRecipe)}
      </div>,
      getPopupRoot()
    )}
  </>;
};

const renderRecipe = (id: string): JSX.Element =>
  <Recipe key={id} id={id} canExplore={false} canFavorite={false}/>;
