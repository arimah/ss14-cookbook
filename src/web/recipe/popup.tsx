import { cloneElement, ReactElement, Ref, useMemo } from 'react';
import { Entity } from '../../types';
import { useGameData } from '../context';
import { Popup, usePopupTrigger } from '../popup';
import { EntitySprite } from '../sprites';
import { Recipe } from './recipe';

export interface Props {
  id: string | readonly string[];
  children: ReactElement<{
    ref?: Ref<HTMLElement>;
  }>;
}

export const RecipePopup = ({ id, children }: Props): ReactElement => {
  const popup = usePopupTrigger();

  const childWithRef = cloneElement(children, {
    ref: popup.triggerRef,
  });

  return <>
    {childWithRef}
    <Popup {...popup} placement='below' interactive>
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

export interface ReagentInfoPopupProps {
  recipes: readonly string[] | undefined;
  sources: readonly string[];
  children: ReactElement<{
    ref?: Ref<HTMLElement>;
  }>;
}

export const ReagentInfoPopup = ({
  recipes,
  sources,
  children,
}: ReagentInfoPopupProps): ReactElement => {
  const { entityMap } = useGameData();

  const popup = usePopupTrigger();

  const childWithRef = cloneElement(children, {
    ref: popup.triggerRef,
  });

  const popupContent = useMemo(() => (
    <div className='popup_recipe'>
      {recipes?.map(renderRecipe)}
      {sources.length > 0 && (
        <div className='popup_foodseq'>
          <p>Common sources:</p>
          {sources.map(id => renderReagentSource(id, entityMap))}
        </div>
      )}
    </div>
  ), [recipes, sources]);

  return <>
    {childWithRef}
    <Popup {...popup} placement='below' interactive>
      {popupContent}
    </Popup>
  </>;
};

const renderReagentSource = (
  id: string,
  entityMap: ReadonlyMap<string, Entity>
): ReactElement => {
  const entity = entityMap.get(id)!;
  return (
    <p key={id} className='popup_entity'>
      <EntitySprite id={id}/>
      {entity.name}
    </p>
  );
};
