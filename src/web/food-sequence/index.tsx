import { ReactElement, memo, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { useGameData } from '../context';
import { NeutralCollator } from '../helpers';
import { SeqStartPoint } from './start-point';

export const FoodSequences = memo((): ReactElement => {
  const { entityList, entityMap, reagentMap } = useGameData();

  const startPoints = useMemo(() => {
    return entityList
      .filter(ent => ent.seqStart != null)
      .sort((a, b) => NeutralCollator.compare(a.name, b.name));
  }, [entityList, entityMap, reagentMap]);

  const { state } = useLocation();

  const startPointRefs = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    const forEntity = state?.forEntity;
    if (typeof forEntity === 'string') {
      startPointRefs.current.get(forEntity)?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    }
  }, []);

  return (
    <main className='foodseq'>
      <p>Some foods can have items, usually foods, inserted into them &ndash; or, in the case of burger buns, put on them. Hold the ingredient in hand and click the receiver. In some places this system is referred to as <i>food sequences</i>.</p>

      <ul className='foodseq_list'>
        {startPoints.map(ent =>
          <li
            key={ent.id}
            ref={elem => {
              if (elem) {
                startPointRefs.current.set(ent.id, elem);
              } else {
                startPointRefs.current.delete(ent.id);
              }
            }}
          >
            <SeqStartPoint entity={ent}/>
          </li>
        )}
      </ul>
    </main>
  );
});
