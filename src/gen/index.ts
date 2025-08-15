import {readFileSync} from 'fs';
import {resolve} from 'path';

import {findResourceFiles, readRawGameData} from './read-raw';
import {filterRelevantPrototypes} from './filter-relevant';
import {resolvePrototypes} from './resolve-prototypes';
import {resolveSpecials} from './resolve-specials';
import {buildSpriteSheet} from './build-spritesheet';
import {getGitCommitHash} from './commit-hash';
import {ProcessedGameData, saveData} from './save-data';
import {
  MethodEntities,
  MicrowaveRecipeTypes,
  ResolvedEntity,
  SpecialDiet,
  SpecialReagent,
} from './types';
import { parse } from 'yaml';

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
  readonly ignoredRecipes?: string[];
  readonly ignoredSpecialRecipes?: string[];
  readonly ignoreSourcesOf?: string[];
  readonly forceIncludeReagentSources?: Record<string, string[]>;
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
  console.log(
    `Loaded ${
      raw.entities.size
    } entities, ${
      raw.reagents.size
    } reagents, ${
      raw.recipes.length
    } microwave meal recipes, ${
      raw.reactions.length
    } reactions, ${
      raw.stacks.size
    } stacks`
  );

  const filtered = filterRelevantPrototypes(
    raw,
    fork.specialDiets ?? [],
    {
      ignoredRecipes: new Set(fork.ignoredRecipes ?? []),
      ignoredSpecialRecipes: new Set(fork.ignoredSpecialRecipes ?? []),
      ignoreSourcesOf: new Set(fork.ignoreSourcesOf ?? []),
      forceIncludeReagentSources: new Map(
        Object.entries(fork.forceIncludeReagentSources ?? {})
      ),
    }
  );
  console.log(
    `${
      filtered.recipes.length
    } recipes use ${
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
    raw.entities,
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
    resolved,
    fork.specialDiets ?? [],
    fork.specialReagents ?? []
  );
  console.log(
    `Resolved ${
      specials.length
    } special diets and reagents`
  );

  const sortingIdRewrites = readRewrites(
    fork.sortingIdRewrites ?? [],
    resolved.entities
  );

  const spriteSheet = await buildSpriteSheet(
    resolved,
    resolve(fork.path, TexturesSubPath),
    fork.mixFillState
  );
  console.log(`Built sprite sheet for ${spriteSheet.points.size} sprites`);

  console.log(`Finished building ${id}`);

  return {
    id,
    name: fork.name,
    description: fork.description,
    default: fork.default ?? false,
    hidden: fork.hidden,
    resolved,
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

main().catch(err => {
  console.error(err);
  process.exit(1);
});
