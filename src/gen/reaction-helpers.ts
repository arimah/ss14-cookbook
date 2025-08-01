import {ReactionPrototype, isCreateEntityEffect} from './types';

export const getReagentResult = (
  reaction: ReactionPrototype
): [string, number] | null => {
  if (!reaction.products) {
    return null;
  }

  const products = Object.entries(reaction.products);
  if (products.length !== 1) {
    return null;
  }

  // products[0] is a tuple of [ReagentId, amount]
  return products[0];
};

export const getSolidResult = (
  reaction: ReactionPrototype
): string | null => {
  if (!reaction.effects || reaction.effects.length === 0) {
    return null;
  }

  let result: string | null = null;

  for (const effect of reaction.effects) {
    if (isCreateEntityEffect(effect)) {
      if (result) {
        // This reaction makes more than one solid result - abort.
        return null;
      }
      result = effect.entity;
    }
  }

  return result;
};
