import {
  EntityId,
  ReactionPrototype,
  ReagentId,
  isCreateEntityEffect,
  isSpawnEntityEffect,
} from './prototypes';

export const getReagentResult = (
  reaction: ReactionPrototype
): [ReagentId, number] | null => {
  if (!reaction.products) {
    return null;
  }

  const products = Object.entries(reaction.products);
  if (products.length !== 1) {
    return null;
  }
  return products[0] as [ReagentId, number];
};

export const getSolidResult = (
  reaction: ReactionPrototype
): EntityId | null => {
  if (!reaction.effects || reaction.effects.length === 0) {
    return null;
  }

  let result: EntityId | null = null;

  for (const effect of reaction.effects) {
    if (isCreateEntityEffect(effect) || isSpawnEntityEffect(effect)) {
      if (result) {
        // This reaction makes more than one solid result - abort.
        return null;
      }
      result = effect.entity;
    }
  }

  return result;
};
