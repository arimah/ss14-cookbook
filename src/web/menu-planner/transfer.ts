import { Base64 } from 'js-base64';
import { deflateSync, inflateSync } from 'fflate';
import { CookingMenu } from './types';

const CurrentVersion = 2;

type ValidVersion = 1 | typeof CurrentVersion;

type PlainObject = Record<string, unknown>;

interface ExportedMenu {
  /** Format version number. */
  readonly v: typeof CurrentVersion;
  /** Menu ID, corresponding to `CookingMenu.id`. */
  readonly id: string;
  /** Menu name, corresponding to `CookingMenu.name`. */
  readonly n: string;
  /** Recipe IDs, joined with `' '`, corresponding to `CookingMenu.recipes`. */
  readonly r: string;
  /**
   * Solid ingredient IDs, joined with `' '`, corresponding to
   * `CookingMenu.solidIngredients`.
   */
  readonly si: string;
  /**
   * Reagent ingredient IDs, joined with `' '`, corresponding to
   * `CookingMenu.reagentIngredients`.
   */
  readonly ri: string;
  /** Last fork, corresponding to `CookingMenu.lastFork`. */
  readonly f: string;
}

export const exportMenu = (menu: CookingMenu): string => {
  const exported: ExportedMenu = {
    v: CurrentVersion,
    id: menu.id,
    n: menu.name,
    r: menu.recipes.join(' '),
    si: menu.solidIngredients.join(' '),
    ri: menu.reagentIngredients.join(' '),
    f: menu.lastFork,
  };
  const source = JSON.stringify(exported);
  const utf8 = new TextEncoder().encode(source);
  const compressed = deflateSync(utf8);
  return Base64.fromUint8Array(compressed, true);
};

export const importMenu = (data: string): CookingMenu | null => {
  try {
    const compressed = Base64.toUint8Array(data);
    const utf8 = inflateSync(compressed);
    const source = new TextDecoder().decode(utf8);
    return parseImport(JSON.parse(source));
  } catch (e) {
    console.error('Error importing menu:', e);
    return null;
  }
};

const isPlainObject = (value: unknown): value is PlainObject =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const parseImport = (value: unknown): CookingMenu => {
  if (!isPlainObject(value)) {
    throw new TypeError('import: root object is not an object');
  }

  const version = parseVersion(value.v);
  return parseMenu(version, value);
};

const parseVersion = (value: unknown): ValidVersion => {
  if (typeof value !== 'number') {
    throw new TypeError('import: `v` is not a number');
  }
  switch (value) {
    case 1:
    case CurrentVersion:
      return value;
    default:
      throw new RangeError(`import: invalid version: ${value}`);
  }
};

const parseMenu = (
  version: ValidVersion,
  value: PlainObject
): CookingMenu => {
  switch (version) {
    case 1:
      return parseMenuV1(value);
    case 2:
      return parseMenuV2(value);
  }
};

const parseMenuV1 = (value: PlainObject): CookingMenu => {
  const menu = value.m;
  if (!isPlainObject(menu)) {
    throw new Error('import: `m` is not an object');
  }
  return menu as unknown as CookingMenu;
};

const parseMenuV2 = (value: PlainObject): CookingMenu => ({
  id: String(value.id),
  name: String(value.n),
  recipes: parseIdList(value.r),
  solidIngredients: parseIdList(value.si),
  reagentIngredients: parseIdList(value.ri),
  lastFork: String(value.f),
});

const parseIdList = (value: unknown): readonly string[] =>
  String(value)
    .split(' ')
    // Remove empty entries. Ugly, shouldn't happen, but whatever.
    .filter(Boolean);
