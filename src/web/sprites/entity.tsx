import {memo} from 'react';

import {useGameData} from '../context';

export interface EntitySpriteProps {
  id: string;
}

export const EntitySprite = memo((props: EntitySpriteProps): JSX.Element => {
  const {id} = props;

  const {entityMap} = useGameData();

  const entity = entityMap.get(id)!;

  return (
    <span
      className='sprite'
      style={{
        backgroundPosition: `-${entity.sprite[0]}px -${entity.sprite[1]}px`,
      }}
      role='img'
      aria-label={entity.name}
    />
  );
});
