import { readFileSync } from 'node:fs';
import { EntityId, EntityMap, EntityPrototype } from './prototypes';

/**
 * Synchronously reads a file as a string, assuming its contents are UTF-8,
 * and strips the BOM (byte-order mark) if present.
 */
export const readFileTextWithoutTheStupidBOM = (path: string): string => {
  const text = readFileSync(path, 'utf-8');
  return text.replace(/^\uFEFF/, '');
};

export function* entityAndAncestors(
  entity: EntityPrototype,
  allEntities: EntityMap
): Generator<EntityPrototype, void, undefined> {
  // Traverse the entity's ancestors *first*, so the entity can override
  // properties later.
  for (const parentId of parents(entity)) {
    const parent = allEntities.get(parentId);
    if (!parent) {
      console.warn(`Entity '${entity.id}' has unknown parent '${parentId}'`);
      continue;
    }
    yield* entityAndAncestors(parent, allEntities);
  }

  yield entity;
}

function* parents(
  entity: EntityPrototype
): Generator<EntityId, void, undefined> {
  const { parent } = entity;
  if (typeof parent === 'string') {
    yield parent;
  } else if (Array.isArray(parent)) {
    // The game processes parents from right to left. That is, the leftmost
    // parent takes precedence over the rightmost.
    for (let i = parent.length - 1; i >= 0; i--) {
      yield parent[i];
    }
  }
  // Otherwise, nothing
}

export interface MapToObjectFn {
  <K extends string, V>(map: ReadonlyMap<K, V>): Record<K, V>;
  <K extends string, V, W>(
    map: ReadonlyMap<K, V>,
    mapValue: (value: V, key: K) => W
  ): Record<K, W>;
}

export const mapToObject = (<K extends string, V, W = V>(
  map: ReadonlyMap<K, V>,
  mapValue?: (value: V, key: K) => W
): Record<K, W> => {
  if (!mapValue) {
    // If mapValue is absent, then V = W, so we can do this.
    mapValue = ((v: V) => v) as unknown as (value: V) => W;
  }

  const result: Record<K, W> = {} as Record<K, W>;
  for (const [key, value] of map) {
    result[key] = mapValue(value, key);
  }
  return result;
}) as MapToObjectFn;
