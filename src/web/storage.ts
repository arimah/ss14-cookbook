import {useMemo} from "react";

export const FavoritesKey = 'ss14-cookbook/favorites';

export const SavedFiltersKey = 'ss14-cookbook/saved-filters';

export const SavedMenusKey = 'ss14-cookbook/menus';

export const NoticesKey = 'ss14-cookbook/notices';

export const FirstVisitKey = 'ss14-cookbook/first-visit';

/**
 * A type safe-ish wrapper around local storage that primarily ensures the same
 * type is written to and read from a single key.
 */
export interface Storage<T> {
  has(): boolean;
  read(initial: T | (() => T)): T;
  write(value: T): void;
}

export const useStorage = <T>(key: string): Storage<T> =>
  useMemo<Storage<T>>(() => ({
    has: () => has(key),
    read: initial => read(key, initial),
    write: value => write(key, value),
  }), [key]);

const has = (key: string): boolean => {
  try {
    return localStorage.getItem(key) !== null;
  } catch (e) {
    console.warn(`has: ${key}: error reading localStorage:`, e);
    return false;
  }
};

const read = <T>(key: string, initial: T | (() => T)): T => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch (e) {
    console.warn(`read: ${key}: error reading localStorage:`, e);
    return resolveInitial(initial);
  }
  if (!raw) {
    // We treat null and empty string as 'not set'. This isn't an error,
    // just return the initial value.
    return resolveInitial(initial);
  }

  let parsed: T;
  try {
    parsed = JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`read: ${key}: error parsing JSON:`, e);
    return resolveInitial(initial);
  }
  return parsed;
};

const resolveInitial = <T>(initial: T | (() => T)) =>
  typeof initial === 'function'
    ? (initial as () => T)()
    : initial;

const write = <T>(key: string, value: T): void => {
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
  } catch (e) {
    console.warn(`save: ${key}: error writing to localStorage:`, e);
  }
};
