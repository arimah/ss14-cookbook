import {useCallback, useRef, useState} from 'react';
import {produce} from 'immer';

import {SavedFiltersKey, useStorage} from '../storage';

import {RecipeFilter, Method} from './filter';

export interface SavedFilters {
  readonly loadAll: () => readonly SavedFilter[];
  readonly load: (index: number) => RecipeFilter;
  readonly loadInto: (index: number, filter: RecipeFilter) => RecipeFilter;
  readonly save: (filter: RecipeFilter, name: string) => void;
  readonly delete: (index: number) => void;
}

export interface SavedFilter {
  readonly name: string;
  readonly methods: readonly Method[];
  readonly ingredients: readonly string[];
  readonly reagents: readonly string[];
}

export const useSavedFilters = (): SavedFilters => {
  const storage = useStorage<readonly SavedFilter[]>(SavedFiltersKey);

  const filters = useRef<readonly SavedFilter[] | null>(null);

  const loadAll = useCallback((): readonly SavedFilter[] => {
    if (!filters.current) {
      filters.current = storage.read([]);
    }
    return filters.current;
  }, []);

  const load = useCallback((index: number): RecipeFilter => {
    throw new Error('Not implemented');
  }, []);

  const loadInto = useCallback((
    index: number,
    filter: RecipeFilter
  ): RecipeFilter => {
    return produce(filter, draft => {
    });
  }, []);

  const save = useCallback((
    filter: RecipeFilter,
    name: string
  ) => {
  }, []);

  const del = useCallback((index: number) => {
  }, []);

  return {
    loadAll,
    load,
    loadInto,
    save,
    delete: del,
  };
};
