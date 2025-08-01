import {existsSync, writeFileSync} from 'fs';
import {dirname, resolve} from 'path';
import {createHash} from 'crypto';

import {JimpInstance} from 'jimp';

import {
  GameData,
  Entity,
  Reagent,
  Recipe,
  ForkData,
} from '../types';

import {SpriteSheetData} from './build-spritesheet';
import {ResolvedGameData} from './resolve-prototypes';
import {ResolvedSpecials} from './resolve-specials';
import {mapToObject} from './helpers';
import {
  GameDataPath,
  SpriteSheetPath,
  SpriteSheetFileName,
  ForkListPath,
} from './constants';
import {MicrowaveRecipeTypes, ResolvedEntity} from './types';

export interface ProcessedGameData {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly default: boolean;
  readonly hidden?: boolean;
  readonly resolved: ResolvedGameData;
  readonly specials: ResolvedSpecials,
  readonly sprites: SpriteSheetData;
  readonly microwaveRecipeTypes?: MicrowaveRecipeTypes;
  readonly sortingIdRewrites: Record<string, string>;
  readonly repo: string;
  readonly commitHash: string;
}

export const saveData = async (
  data: readonly ProcessedGameData[]
): Promise<void> => {
  const dir = dirname(__dirname);

  const dataWithSpriteHash = await Promise.all(
    data.map(async d => ({
      ...d,
      spriteHash: await getSpriteHash(d.sprites.sheet),
    }))
  );

  const now = Date.now();
  const index: ForkData[] = [];
  for (const d of dataWithSpriteHash) {
    const entities: Entity[] = [];
    for (const [id, entity] of d.resolved.entities) {
      entities.push({
        id,
        name: entity.name,
        sprite: d.sprites.points.get(id)!,
        traits: getSpecialsMask(entity, d.specials),
      });
    }

    const reagents: Reagent[] = [];
    for (const [id, reagent] of d.resolved.reagents) {
      reagents.push({
        id,
        name: reagent.name,
        color: reagent.color,
        sources: d.resolved.reagentSources.get(id) ?? [],
      });
    }

    const ingredients = new Set<string>();

    const recipes: Recipe[] = [];
    for (const [id, recipe] of d.resolved.recipes) {
      recipes.push({id, ...recipe});

      for (const solid of Object.keys(recipe.solids)) {
        ingredients.add(solid);
      }
    }

    const finalData: GameData = {
      entities,
      reagents,
      ingredients: Array.from(ingredients),
      recipes,

      methodSprites: mapToObject(d.sprites.methods),
      beakerFill: d.sprites.beakerFillPoint,
      microwaveRecipeTypes:
        d.microwaveRecipeTypes &&
        d.sprites.microwaveRecipeTypes
          ? mapToObject(d.sprites.microwaveRecipeTypes, (sprite, subtype) => {
            const def = d.microwaveRecipeTypes![subtype];
            return {
              sprite,
              verb: def.verb,
              filterSummary: def.filterSummary,
            };
          })
          : null,
      spriteSheet: SpriteSheetFileName(d.id, d.spriteHash),
      sortingIdRewrites: d.sortingIdRewrites,

      specialTraits: d.specials.map(s => ({
        mask: s.mask,
        hint: s.hint,
        color: s.color,
        filterName: s.filterName,
        filterSummary: s.filterSummary,
      })),
      attributions: d.sprites.attributions,
    };
    const json = JSON.stringify(finalData);
    const hash = getDataHash(json);
    const path = resolve(dir, GameDataPath(d.id, hash));
    if (!existsSync(path)) {
      console.log(`Create: ${path}`);
    }
    writeFileSync(path, json, {
      encoding: 'utf-8',
    });

    index.push({
      id: d.id,
      hash,
      name: d.name,
      description: d.description,
      default: d.default,
      hidden: d.hidden || undefined,
      meta: {
        commit: d.commitHash,
        repo: d.repo,
        date: now,
      },
    });
  }

  const indexJson = JSON.stringify(index);
  writeFileSync(resolve(dir, ForkListPath), indexJson, {
    encoding: 'utf-8',
  });

  const createWebp = (await import('imagemin-webp')).default({
    alphaQuality: 100,
    quality: 100,
    lossless: true,
    preset: 'drawing',
    metadata: 'none',
  });

  await Promise.all(dataWithSpriteHash.map(async d => {
    const fullPath = resolve(dir, SpriteSheetPath(d.id, d.spriteHash));
    const png = await d.sprites.sheet.getBuffer('image/png');
    const webp = await createWebp(png);
    if (!existsSync(fullPath)) {
      console.log(`Create: ${fullPath}`);
    }
    writeFileSync(fullPath, webp);
  }));
};

const getSpecialsMask = (
  ent: ResolvedEntity,
  specials: ResolvedSpecials
): number => {
  let mask = 0;
  for (const special of specials) {
    if (special.entityMatches(ent)) {
      mask |= special.mask;
    }
  }
  return mask;
};

const getSpriteHash = async (sheet: JimpInstance): Promise<string> => {
  const buf = await sheet.getBuffer('image/png');
  return getDataHash(buf);
};

const getDataHash = (data: string | Buffer): string => {
  const hash = createHash('sha1');
  hash.update(data);
  const hex = hash.digest('hex');
  return hex.slice(0, 8);
};
