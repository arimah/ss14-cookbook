import { Solution } from './components';
import { ResolvedEntity, ResolvedEntityMap } from './types';

export const findSolution = (
  allEntities: ResolvedEntityMap,
  ent: ResolvedEntity,
  id: string
): Solution | null => {
  const { solutions } = ent;
  if (!solutions) {
    return null;
  }

  // We resolve solutions through the *new* components first, and fall back to
  // legacy stuff only if necessary. In theory there should be no overlap.

  // This entity *directly* declares the solution. Good enough.
  if (solutions.ownId === id) {
    return solutions.ownSolution;
  }

  if (solutions.spawned) {
    for (const spawnedId of solutions.spawned) {
      const spawnedEntity = allEntities.get(spawnedId);
      if (!spawnedEntity) {
        console.warn(
          `Entity '${ent.id}': SolutionManager entity not found: ${spawnedId}`
        );
        continue;
      }

      // In *theory*, the spawned entity should have a SolutionComponent and
      // not much else. This shouldn't recurse indefinitely.
      const spawnedSolution = findSolution(allEntities, spawnedEntity, id);
      if (spawnedSolution) {
        return spawnedSolution;
      }
    }
  }

  // Fall back to the legacy solution. So simple!
  return solutions.legacy?.[id] ?? null;
};
