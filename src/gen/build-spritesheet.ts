import {existsSync, readFileSync} from 'fs';
import {resolve, join as joinPath} from 'path';

import {Jimp, JimpInstance} from 'jimp';

import {SpritePoint, SpriteAttribution, Recipe} from '../types';

import {ResolvedGameData} from './resolve-prototypes';
import {SpriteOffsets, ColorWhite} from './constants';
import {readFileTextWithoutTheStupidBOM} from './helpers';
import {ParsedColor, ResolvedEntity, ResolvedSpriteLayerState} from './types';

export interface SpriteSheetData {
  readonly sheet: JimpInstance;
  readonly points: ReadonlyMap<string, SpritePoint>;
  readonly methods: ReadonlyMap<Recipe['method'], SpritePoint>;
  readonly beakerFillPoint: SpritePoint;
  /** Frontier */
  readonly microwaveRecipeTypes?: ReadonlyMap<string, SpritePoint>;
  readonly attributions: readonly SpriteAttribution[];
}

// Temporary type used while building attributions
type AttributionData = Omit<SpriteAttribution, 'sprites'> & {
  sprites: Map<string, SpritePoint>;
};

// All item sprites are 32x32 throughout the game
const SpriteSize = 32;
const SheetWidth = 24; // sprites

const ZeroOffset: SpritePoint = [0, 0];

export const buildSpriteSheet = async (
  resolved: ResolvedGameData,
  textureDir: string,
  mixFillState: string
): Promise<SpriteSheetData> => {
  const spriteCount =
    resolved.entities.size +
    // Cooking methods
    resolved.methodEntities.size +
    // Frontier: microwave recipe types
    (
      resolved.microwaveRecipeTypeEntities
        /* -1 for microwave, which is included above.
         * Yes, this is a horrible hack.
         */
        ? resolved.microwaveRecipeTypeEntities.size - 1
        : 0
    ) +
    // Beaker fill
    1;

  const width = SpriteSize * SheetWidth;
  const height = SpriteSize * Math.ceil(spriteCount / SheetWidth);
  const sheet = new Jimp({width, height});

  const spriteCache = new SpriteCache(textureDir);

  const points = new Map<string, SpritePoint>();

  let i = 0;
  for (const [id, entity] of resolved.entities) {
    const point = await drawEntity(sheet, i, entity, spriteCache);
    points.set(id, point);
    i++;
  }

  const methods = new Map<Recipe['method'], SpritePoint>();
  for (const [method, entity] of resolved.methodEntities) {
    const point = await drawEntity(sheet, i, entity, spriteCache);
    methods.set(method, point);
    i++;
  }

  let microwaveRecipeTypes: Map<string, SpritePoint> | undefined;
  if (resolved.microwaveRecipeTypeEntities) {
    microwaveRecipeTypes = new Map<string, SpritePoint>();
    for (const [subtype, entity] of resolved.microwaveRecipeTypeEntities) {
      let point: SpritePoint;
      // This is a horrendous, hideous, ugly-ass hardcoded hack that I hate.
      // FIXME: Come up with a better way to reuse sprites, for fuck's sake
      if (subtype === 'Microwave') {
        point = methods.get('microwave')!;
      } else {
        point = await drawEntity(sheet, i, entity, spriteCache);
      }
      microwaveRecipeTypes.set(subtype, point);
      i++;
    }
  }

  const beakerLarge = resolved.methodEntities.get('mix')!;
  const beakerFillPoint: SpritePoint = [
    SpriteSize * (i % SheetWidth),
    SpriteSize * Math.floor(i / SheetWidth),
  ];
  await drawSprite(
    sheet,
    beakerFillPoint,
    beakerLarge.color,
    [{
      // FIXME: Ugly
      path: beakerLarge.spriteLayers[0].path,
      state: mixFillState,
      color: ColorWhite,
    }],
    spriteCache,
    beakerLarge.id
  );

  return {
    sheet,
    points,
    methods,
    beakerFillPoint,
    microwaveRecipeTypes,
    attributions: spriteCache.getAttributions(),
  };
};

const drawEntity = async (
  sheet: JimpInstance,
  index: number,
  entity: ResolvedEntity,
  spriteCache: SpriteCache
): Promise<SpritePoint> => {
  const point = placeSprite(index);
  const offset = SpriteOffsets[entity.id] ?? ZeroOffset;
  await drawSprite(
    sheet,
    [point[0] + offset[0], point[1] + offset[1]],
    entity.color,
    entity.spriteLayers,
    spriteCache,
    entity.id
  );
  return point;
};

const placeSprite = (index: number): SpritePoint =>
  [
    SpriteSize * (index % SheetWidth),
    SpriteSize * Math.floor(index / SheetWidth),
  ];

const drawSprite = async (
  sheet: JimpInstance,
  point: SpritePoint,
  color: ParsedColor,
  layers: readonly ResolvedSpriteLayerState[],
  spriteCache: SpriteCache,
  forEntity: string
): Promise<void> => {
  for (const layer of layers) {
    let sprite = await spriteCache.read(
      layer.path,
      layer.state,
      forEntity,
      point
    );

    if (color !== ColorWhite || layer.color !== ColorWhite) {
      const mixedColor = multiplyColors(color, layer.color);

      sprite = sprite.clone();
      modulateByColor(sprite, mixedColor);
    }

    sheet.blit({
      x: point[0],
      y: point[1],
      src: sprite,
      srcX: 0,
      srcY: 0,
      srcW: SpriteSize,
      srcH: SpriteSize,
    });
  }
};

const modulateByColor = (image: JimpInstance, color: ParsedColor): void => {
  const r = (color >>> 24) & 0xFF;
  const g = (color >>> 16) & 0xFF;
  const b = (color >>> 8) & 0xFF;

  const bitmap = image.bitmap.data;
  for (let i = 0; i < bitmap.length; i += 4) {
    bitmap[i] = Math.floor((bitmap[i] * r) / 255);
    bitmap[i + 1] = Math.floor((bitmap[i + 1] * g) / 255);
    bitmap[i + 2] = Math.floor((bitmap[i + 2] * b) / 255);
  }
};

const multiplyColors = (
  color1: ParsedColor,
  color2: ParsedColor
): ParsedColor => {
  const r1 = (color1 >>> 24) & 0xFF;
  const r2 = (color2 >>> 24) & 0xFF;

  const g1 = (color1 >>> 16) & 0xFF;
  const g2 = (color2 >>> 16) & 0xFF;

  const b1 = (color1 >>> 8) & 0xFF;
  const b2 = (color2 >>> 8) & 0xFF;

  const a1 = color1 & 0xFF;
  const a2 = color2 & 0xFF;

  // Outside of `>>>`, JS does not have unsigned bit operations. If the red
  // value overflows into the sign bit, we'll end up with a negative number.
  // However, we can fudge it by shifting the entire result with `>>> 0`, which
  // will force JS to interpret the whole thing as an unsigned 32-bit integer.
  // This is mental.
  return (
    (Math.floor((r1 * r2) / 255) << 24) |
    (Math.floor((g1 * g2) / 255) << 16) |
    (Math.floor((b1 * b2) / 255) << 8) |
    (Math.floor((a1 * a2) / 255))
  ) >>> 0;
};

class SpriteCache {
  private readonly dir: string;
  private readonly data = new Map<string, JimpInstance>();
  private readonly attributions = new Map<string, AttributionData>();

  public constructor(dir: string) {
    this.dir = dir;
  }

  public async read(
    path: string,
    state: string,
    forEntity: string,
    point: SpritePoint
  ): Promise<JimpInstance> {
    const key = joinPath(path, `${state}.png`);

    const attribution = this.loadAttributions(path);
    attribution.sprites.set(point.toString(), point);

    let image = this.data.get(key);
    if (!image) {
      const fullPath = resolve(this.dir, key);

      if (existsSync(fullPath)) {
        try {
          image = await this.tryReadPng(fullPath);
        } catch (e) {
          throw new Error(`Error reading ${fullPath}: ${e}`, { cause: e });
        }
      } else {
        console.error(
          `Unable to resolve sprite path for state '${
            state
          }' in '${
            path
          }' for ${forEntity}`
        );
        // Return an empty image...
        image = new Jimp({width: SpriteSize, height: SpriteSize});
      }

      this.data.set(key, image);
    }

    return image;
  }

  private async tryReadPng(fullPath: string): Promise<JimpInstance> {
    // This whole code is stupid.
    //
    // Unfortunately, for WHATEVER REASON, PNGs in SS14 often end with random
    // bullshit data at the end of the stream. Jimp's PNG parser rejects this
    // invalid trailing data, while the game just shrugs and throws it away.
    // Since sneaky trailing data makes its way into the game with astonishing
    // regularity and is never caught by anyone in any kind of review, we've
    // fudged the PNG reading a bit here.
    //
    // Basically: If the PNG reader throws an error with the exact message
    // "unrecognised content at end of stream", then we shave one (1) byte off
    // the end of the buffer and try again, up to 4 bytes. In practice it seems
    // the stream tends to contain 2 extra bytes; I'm guessing whatever program
    // people are using to save their PNGs pads the file size up to a multiple
    // of 4.
    const MagicErrorMessage = 'unrecognised content at end of stream';

    let buffer = readFileSync(fullPath);
    let bytesStripped = 0;
    for (;;) {
      // This is so dumb.
      try {
        return await Jimp.fromBuffer(buffer) as JimpInstance;
      } catch (e) {
        if (
          !(e instanceof Error) || // not an error
          e.message !== MagicErrorMessage || // wrong message
          bytesStripped === 4 // too many attempts, idgaf
        ) {
          throw e;
        }

        buffer = buffer.subarray(0, buffer.length - 1);
        bytesStripped++;
      }
    }
  }

  public getAttributions(): readonly SpriteAttribution[] {
    const collator = new Intl.Collator('en-US', {
      caseFirst: 'false',
      ignorePunctuation: false,
    });
    return Array.from(
      this.attributions.values(),
      attr => ({
        ...attr,
        sprites: Array.from(attr.sprites.values()),
      })
    ).sort((a, b) => collator.compare(a.path, b.path));
  }

  private loadAttributions(path: string): AttributionData {
    let attribution = this.attributions.get(path);

    if (!attribution) {
      const metaPath = resolve(this.dir, joinPath(path, 'meta.json'));
      const metaRaw = readFileTextWithoutTheStupidBOM(metaPath);
      let meta: any;
      try {
        meta = JSON.parse(metaRaw);
      } catch (e) {
        meta = {
          license: '(invalid sprite metadata)',
          copyright: '(invalid sprite metadata)',
        };
        console.error(`${metaPath}: Error parsing attributions:`, e);
      }

      attribution = {
        path,
        license: typeof meta.license === 'string' ? meta.license : '',
        copyright: typeof meta.copyright === 'string' ? meta.copyright : '',
        sprites: new Map<string, SpritePoint>(),
      };
      this.attributions.set(path, attribution);
    }
    return attribution;
  }
}
