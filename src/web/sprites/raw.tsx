import { ReactElement, memo } from 'react';
import { SpritePoint } from '../../types';

export interface RawSpriteProps {
  position: SpritePoint;
  alt: string;
}

export const RawSprite = memo(({
  position,
  alt,
}: RawSpriteProps): ReactElement =>
  <span
    className='sprite'
    style={{
      backgroundPosition: `-${position[0]}px -${position[1]}px`,
    }}
    role='img'
    aria-label={alt}
  />
);
