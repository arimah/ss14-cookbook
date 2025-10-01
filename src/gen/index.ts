import {readFileSync} from 'fs';
import {resolve} from 'path';

import {parse} from 'yaml';
import {enableMapSet, setAutoFreeze} from 'immer';

import {findResourceFiles, readRawGameData} from './read-raw';
import {resolveComponents} from './resolve-components';
import {filterRelevantPrototypes} from './filter-relevant';
import {resolvePrototypes} from './resolve-prototypes';
import {resolveSpecials} from './resolve-specials';
import {buildSpriteSheet} from './build-spritesheet';
import {getGitCommitHash} from './commit-hash';
import {ProcessedGameData, saveData} from './save-data';
import {EntityId, MicrowaveMealRecipeId, ReagentId} from './prototypes';
import {
  MethodEntities,
  MicrowaveRecipeTypes,
  ResolvedEntity,
  SpecialDiet,
  SpecialReagent,
} from './types';

interface ForkInfo {
  readonly name: string;
  readonly description: string;
  readonly hidden?: boolean;
  readonly path: string;
  readonly repo: string;
  readonly default?: boolean;
  readonly specialDiets?: SpecialDiet[];
  readonly specialReagents?: SpecialReagent[];
  readonly methodEntities: MethodEntities;
  readonly mixFillState: string;
  /** Frontier */
  readonly microwaveRecipeTypes?: MicrowaveRecipeTypes;
  readonly sortingIdRewrites?: string[];
  readonly ignoredRecipes?: MicrowaveMealRecipeId[];
  readonly ignoredSpecialRecipes?: string[];
  readonly ignoredFoodSequenceElements?: EntityId[];
  readonly ignoreSourcesOf?: ReagentId[];
  readonly forceIncludeReagentSources?: Record<ReagentId, readonly EntityId[]>;
}

const PrototypesSubPath = './Resources/Prototypes';
const LocaleSubPath = './Resources/Locale/en-US';
const TexturesSubPath = './Resources/Textures';

const buildFork = async (id: string, fork: ForkInfo): Promise<ProcessedGameData> => {
  console.log(`Starting work on fork ${id}: ${fork.name}...`);

  const commitHash = await getGitCommitHash(fork.path);
  console.log('Generating data from commit:', commitHash);

  const yamlPaths = findResourceFiles(resolve(fork.path, PrototypesSubPath));
  console.log(`Found ${yamlPaths.length} files`);

  const raw = readRawGameData(yamlPaths);
  console.log(`Loaded:\n${
    Object.entries(raw)
      .filter(([, val]) => (val.size ?? val.length) != null)
      .map(([key, val]) => `- ${key}: ${val.size ?? val.length}`)
      .join('\n')
  }`);

  const entities = resolveComponents(raw);

  const filtered = filterRelevantPrototypes(
    raw,
    entities,
    {
      ignoredRecipes: new Set(fork.ignoredRecipes ?? []),
      ignoredSpecialRecipes: new Set(fork.ignoredSpecialRecipes ?? []),
      ignoreSourcesOf: new Set(fork.ignoreSourcesOf ?? []),
      forceIncludeReagentSources: new Map(
        Object.entries(fork.forceIncludeReagentSources ?? {}) as
          [ReagentId, readonly EntityId[]][]
      ),
      ignoredFoodSequenceElements: new Set(
        fork.ignoredFoodSequenceElements ?? []
      ),
    }
  );
  console.log(
    `Filtered: ${
      filtered.recipes.length
    } recipes, ${
      filtered.entities.size
    } entities, ${
      filtered.reagents.size
    } reagents, ${
      filtered.reactions.length
    } reactions, ${
      filtered.specialRecipes.size
    } special recipes`
  );

  const resolved = resolvePrototypes(
    filtered,
    entities,
    resolve(fork.path, LocaleSubPath),
    fork.methodEntities,
    fork.microwaveRecipeTypes
  );
  console.log(
    `Resolved ${
      resolved.entities.size
    } entities, ${
      resolved.reagents.size
    } reagents and ${
      resolved.recipes.size
    } recipes`
  );

  const specials = resolveSpecials(
    entities,
    fork.specialDiets ?? [],
    fork.specialReagents ?? []
  );
  console.log(`Resolved ${specials.length} special diets and reagents`);

  const sortingIdRewrites = readRewrites(
    fork.sortingIdRewrites ?? [],
    resolved.entities
  );

  const spriteSheet = await buildSpriteSheet(
    resolved,
    resolve(fork.path, TexturesSubPath),
    fork.mixFillState
  );
  console.log(`Built sprite sheet for ${spriteSheet.spriteCount} sprites`);

  console.log(`Finished building ${id}`);

  return {
    id,
    name: fork.name,
    description: fork.description,
    default: fork.default ?? false,
    hidden: fork.hidden,
    resolved,
    foodSequenceStartPoints: filtered.foodSequenceStartPoints,
    foodSequenceElements: filtered.foodSequenceElements,
    specials,
    sprites: spriteSheet,
    microwaveRecipeTypes: fork.microwaveRecipeTypes,
    sortingIdRewrites,
    commitHash,
    repo: fork.repo,
  };
};

const readRewrites = (
  paths: readonly string[],
  entities: ReadonlyMap<string, ResolvedEntity>
): Record<string, string> =>
  paths.reduce((result, path) => {
    const rewrites = readYamlFile(path) as Record<string, string>;

    for (const [key, value] of Object.entries(rewrites)) {
      if (!entities.has(key)) {
        console.warn(`Unknown entity prototype ID in rewrite file: ${key}`);
      }
      result[key] = value;
    }

    return result;
  }, {} as Record<string, string>);

const readYamlFile = (path: string): unknown => {
  const source = readFileSync(path, 'utf-8');
  return parse(source, {
    // Shut up about unresolved tags
    logLevel: 'silent',
  });
};

const main = async () => {
  const forkListPath = process.argv[2];
  if (!forkListPath) {
    console.error('Received no fork list path!');
    return;
  }

  const forkList = readYamlFile(forkListPath) as Readonly<Record<string, ForkInfo>>;

  const forkData: ProcessedGameData[] = [];
  for (const [id, fork] of Object.entries(forkList)) {
    forkData.push(await buildFork(id, fork));
    console.log('');
  }

  console.log('Finished building everything. Writing data...');
  await saveData(forkData);
  console.log('Done.');
};

// I love you, Immer, yet you wound me so.
enableMapSet();
// Weird perf. issues, loads of objects to process.
setAutoFreeze(false);

main().catch(err => {
  console.error(err);
  process.exit(1);
});
