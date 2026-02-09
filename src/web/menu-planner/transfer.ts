import { Base64 } from 'js-base64';
import { deflate, inflate } from 'pako';
import { CookingMenu, CookingMenuVersion } from './types';

interface ExportedMenu {
  readonly v: number;
  readonly m: CookingMenu;
}

export const exportMenu = (menu: CookingMenu): string => {
  const exported: ExportedMenu = {
    v: CookingMenuVersion,
    m: menu,
  };
  const source = JSON.stringify(exported);
  const compressed = deflate(source);
  return Base64.fromUint8Array(compressed, true);
};

export const importMenu = (data: string): CookingMenu | null => {
  try {
    const compressed = Base64.toUint8Array(data);
    const source = inflate(compressed, { to: 'string' });
    const exported: ExportedMenu = parseImport(JSON.parse(source));
    return exported.m;
  } catch (e) {
    console.error('Error importing menu:', e);
    return null;
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const parseImport = (value: unknown): ExportedMenu => {
  if (!isPlainObject(value)) {
    throw new TypeError('import: root object is not an object');
  }

  const version = parseVersion(value.v);
  const menu = parseMenu(value.m);

  return { v: version, m: menu };
};

const parseVersion = (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new TypeError('import: `v` is not a number');
  }
  if (value !== CookingMenuVersion) {
    throw new RangeError(`import: invalid version: ${value}`);
  }
  return value;
};

const parseMenu = (value: unknown): CookingMenu => {
  if (!isPlainObject(value)) {
    throw new TypeError('import: `m` is not an object');
  }
  // TODO: verify value format
  return value as unknown as CookingMenu;
};
