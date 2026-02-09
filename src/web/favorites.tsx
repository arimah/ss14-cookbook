import { produce } from 'immer';
import {
  MouseEvent,
  ReactElement,
  ReactNode,
  createContext,
  memo,
  useContext,
  useMemo,
  useState,
} from 'react';
import { StarOffIcon, StarOnIcon } from './icons';
import { FavoritesKey, useStorage } from './storage';
import { Tooltip } from './tooltip';

interface FavoriteContext {
  readonly isFavorite: (id: string) => boolean;
  readonly toggleFavorite: (id: string) => void;
}

const Context = createContext<FavoriteContext>({
  isFavorite: () => false,
  toggleFavorite() { },
});

interface FavoritesProviderProps {
  children?: ReactNode;
}

export const FavoritesProvider = ({
  children,
}: FavoritesProviderProps): ReactElement => {
  const storage = useStorage<string[]>(FavoritesKey);
  const [favorites, setFavorites] = useState(() => {
    const favs = storage.read([]);
    for (let i = 0; i < favs.length; i++) {
      const migration = Migrations.get(favs[i]);
      if (migration) {
        favs[i] = migration;
      }
    }
    return new Set(favs);
  });

  const context = useMemo<FavoriteContext>(() => ({
    isFavorite: id => favorites.has(id),
    toggleFavorite: id => {
      setFavorites(value => {
        const nextValue = produce(value, draft => {
          if (!draft.delete(id)) {
            draft.add(id);
          }
        });
        storage.write(Array.from(nextValue));
        return nextValue;
      });
    },
  }), [favorites, storage]);

  return (
    <Context.Provider value={context}>
      {children}
    </Context.Provider>
  );
};

export interface FavoriteButtonProps {
  id: string;
}

export const FavoriteButton = memo(({
  id,
}: FavoriteButtonProps): ReactElement => {
  const {isFavorite, toggleFavorite} = useContext(Context);

  const isFav = isFavorite(id);

  return (
    <Tooltip text={isFav ? 'Remove from favourites' : 'Mark as favourite'}>
      <button
        aria-label='Mark as favourite'
        aria-pressed={isFav}
        className='fav'
        onClick={() => toggleFavorite(id)}
        onMouseDown={preventMouseFocus}
      >
        {isFav ? <StarOnIcon/> : <StarOffIcon/>}
      </button>
    </Tooltip>
  );
});

const preventMouseFocus = (e: MouseEvent) => {
  e.preventDefault();
};

export const useIsFavorite = (): ((id: string) => boolean) =>
  useContext(Context).isFavorite;

const Migrations = new Map([
  ['s!CutCheese', 'cut!FoodCheese',],
  ['s!CutChevre', 'cut!FoodChevre',],
  ['s!CutDough', 'cut!FoodDough'],
  ['s!FlattenDough', 'roll!FoodDough'],
  ['s!CutTortillaDough', 'cut!FoodDoughTortilla'],
  ['s!FlattenTortillaDough', 'roll!FoodDoughTortillaSlice'],
  ['s!CutTofu', 'cut!FoodTofu'],
  ['s!CutBread', 'cut!FoodBreadPlain'],
  ['s!CutBaguette', 'cut!FoodBreadBaguette'],
  ['s!CutRawMeat', 'cut!FoodMeat'],
  ['s!CutChickenMeat', 'cut!FoodMeatChicken'],
  ['s!CutSpiderMeat', 'cut!FoodMeatSpider'],
  ['s!CutXenoMeat', 'cut!FoodMeatXeno'],
]);
