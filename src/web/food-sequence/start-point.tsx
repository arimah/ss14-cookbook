import {memo, useMemo} from 'react';

import {Entity} from '../../types';

import {EntitySprite} from '../sprites';
import {useGameData} from '../context';
import {RecipePopup} from '../recipe-popup';
import {NeutralCollator} from '../helpers';

export interface SeqStartPointProps {
  entity: Entity;
}

export const SeqStartPoint = memo((props: SeqStartPointProps): JSX.Element => {
  const {entity} = props;

  const {
    recipesBySolidResult,
    foodSequenceElements,
    entityMap,
  } = useGameData();

  const startRecipe = recipesBySolidResult.get(entity.id);

  const seqStart = entity.seqStart!;
  const elements = useMemo(() => {
    return foodSequenceElements.get(seqStart.key)!
      .slice(0)
      .sort((a, b) => {
        const entA = entityMap.get(a)!;
        const entB = entityMap.get(b)!;
        return NeutralCollator.compare(entA.name, entB.name);
      });
  }, [seqStart, foodSequenceElements, entityMap]);

  return <>
    <p className='foodseq_start'>
      <strong>
        <EntitySprite id={entity.id}/>
        {startRecipe ? (
          <RecipePopup id={startRecipe}>
            <span className='more-info'>{entity.name}</span>
          </RecipePopup>
        ) : entity.name}
      </strong>
      {` accepts up to ${seqStart.maxCount} of:`}
    </p>
    <ul className='foodseq_elements'>
      {elements.map(id => <SeqElement key={id} id={id}/>)}
    </ul>
  </>;
});

interface SeqElementProps {
  id: string;
}

const SeqElement = (props: SeqElementProps): JSX.Element => {
  const {id} = props;

  const {recipesBySolidResult, entityMap} = useGameData();

  const entity = entityMap.get(id)!;
  const recipe = recipesBySolidResult.get(entity.id);

  return (
    <li className='foodseq_element' data-entity-id={entity.id}>
      <EntitySprite id={entity.id}/>
      {recipe ? (
        <RecipePopup id={recipe}>
          <span className='more-info'>{entity.name}</span>
        </RecipePopup>
      ) : <span>{entity.name}</span>}
    </li>
  );
};
