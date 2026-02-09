import { produce } from 'immer';
import {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { ConfirmButton } from '../confirm-button';
import { useGameData } from '../context';
import { useUniqueId } from '../helpers';
import { ArrowLeftIcon, SaveIcon } from '../icons';
import { getPopupRoot } from '../popup-impl';
import { Tooltip } from '../tooltip';
import { useUrl } from '../url';
import { DiscardChangesDialog } from './discard-changes-dialog';
import { IngredientList } from './edit-ingredients';
import { SelectedRecipes } from './edit-selected-recipes';
import { findIngredients } from './ingredients';
import { useStoredMenus } from './storage';
import {
  CookingMenu,
  genId,
  isReagentIngredient,
  isSolidIngredient,
} from './types';
import { MenuWarning } from './warning';

export const MenuEditor = (): ReactElement => {
  const params = useParams();
  const id = params.id || null;

  const navigate = useNavigate();
  const url = useUrl();

  const {
    forkId,
    recipeMap,
    recipesBySolidResult,
    recipesByReagentResult,
    reagentMap,
  } = useGameData();

  const storage = useStoredMenus();

  const initialMenu = useMemo(() => {
    return id ? storage.get(id) ?? null : newMenu(forkId);
  }, [id]);
  const [menu, setMenu] = useState(initialMenu);

  const availableIngredients = useMemo(() => {
    if (!menu) {
      return [];
    }
    return findIngredients(
      menu.recipes,
      recipeMap,
      recipesBySolidResult,
      recipesByReagentResult,
      reagentMap
    );
  }, [
    menu?.recipes,
    recipeMap,
    recipesBySolidResult,
    recipesByReagentResult,
    reagentMap,
  ]);

  const initialHiddenIngredients = useMemo(() => new Set(
    availableIngredients
      .filter(ingredient =>
        // The ingredient is hidden if it's not included.
        ingredient.type === 'solid'
          ? !menu?.solidIngredients.includes(ingredient.entityId)
          : !menu?.reagentIngredients.includes(ingredient.reagentId)
      )
      .map(ingredient => ingredient.id)
  ), [initialMenu]);
  const [hiddenIngredients, setHiddenIngredients] = useState(
    initialHiddenIngredients
  );

  const exampleName = useMemo(() => {
    const index = Math.floor(ExampleNames.length * Math.random());
    return ExampleNames[index];
  }, []);

  const handleChangeName = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setMenu(produce(draft => {
      draft!.name = newName;
    }));
  }, []);

  const handleAddRecipe = useCallback((id: string) => {
    // Assume the recipe is not present
    setMenu(produce(draft => {
      draft!.recipes.push(id);
    }));
  }, []);

  const handleRemoveRecipe = useCallback((id: string) => {
    setMenu(produce(draft => {
      const index = draft!.recipes.indexOf(id);
      // Assume the recipe is in there somewhere
      draft!.recipes.splice(index, 1);
    }));
  }, []);

  const handleMoveRecipe = useCallback((fromIndex: number, delta: 1 | -1) => {
    setMenu(produce(draft => {
      let toIndex = fromIndex + delta;
      if (toIndex < 0 || toIndex >= draft!.recipes.length) {
        return;
      }

      const [recipe] = draft!.recipes.splice(fromIndex, 1);
      draft!.recipes.splice(toIndex, 0, recipe);
    }));
  }, []);

  const handleToggleIngredient = useCallback((id: string) => {
    setHiddenIngredients(produce(draft => {
      if (!draft.delete(id)) {
        draft.add(id);
      }
    }));
  }, []);

  const saveMenu = () => {
    const recipes = menu!.recipes.filter(id => recipeMap.has(id));
    const solidIngredients = availableIngredients
      .filter(isSolidIngredient)
      .filter(ingredient => !hiddenIngredients.has(ingredient.id))
      .map(ingredient => ingredient.entityId);
    const reagentIngredients = availableIngredients
      .filter(isReagentIngredient)
      .filter(ingredient => !hiddenIngredients.has(ingredient.id))
      .map(ingredient => ingredient.reagentId);
    storage.save({
      ...menu!,
      recipes,
      solidIngredients,
      reagentIngredients,
      lastFork: forkId,
    });
  };

  const ignoreDirty = useRef(false);

  const handleSave = () => {
    ignoreDirty.current = true;
    saveMenu();
    navigate(url.menuView(menu!.id), { replace: id === null });
  };

  const handleDiscard = () => {
    ignoreDirty.current = true;
    navigate(id === null ? url.menuList : url.menuView(id));
  };

  const handleDelete = () => {
    ignoreDirty.current = true;
    storage.delete(id!);
    navigate(url.menuList, { replace: true });
  };

  const isDirty =
    initialMenu !== null &&
    menu !== null &&
    isMenuDirty(
      initialMenu,
      menu,
      initialHiddenIngredients,
      hiddenIngredients
    );
  useEffect(() => {
    if (isDirty) {
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Discard?";
      };
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', onBeforeUnload);
      };
    }
    return undefined;
  }, [isDirty]);

  const blocker = useBlocker(() => isDirty && !ignoreDirty.current);

  const htmlId = useUniqueId();

  if (!menu) {
    return (
      <div className='planner_view'>
        <h2>Menu not found</h2>
        <div className='planner_view-actions'>
          <Link to={url.menuList} className='btn floating'>
            <ArrowLeftIcon/>
            <span>Back to listing</span>
          </Link>
        </div>
      </div>
    );
  }

  const unavailableRecipeCount =
    menu.recipes.reduce(
      (count, id) => !recipeMap.has(id) ? count + 1 : count,
      0
    );

  return (
    <div className='planner_editor'>
      <div className='planner_editor-header'>
        <label htmlFor={`${htmlId}-name`}>Name:</label>
        <input
          id={`${htmlId}-name`}
          type='text'
          placeholder={`E.g.: ${exampleName}`}
          value={menu.name}
          onChange={handleChangeName}
        />
        <Actions
          isNew={id == null}
          isDirty={isDirty}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onDelete={handleDelete}
        />
      </div>

      <MenuWarning
        menuFork={menu.lastFork}
        unavailableRecipeCount={unavailableRecipeCount}
      />

      <SelectedRecipes
        recipes={menu.recipes}
        onAddRecipe={handleAddRecipe}
        onRemoveRecipe={handleRemoveRecipe}
        onMoveRecipe={handleMoveRecipe}
      />
      <IngredientList
        availableIngredients={availableIngredients}
        hiddenIngredients={hiddenIngredients}
        onToggleVisible={handleToggleIngredient}
        onAddRecipe={handleAddRecipe}
      />

      {blocker.state === 'blocked' && createPortal(
        <DiscardChangesDialog
          onStay={() => blocker.reset()}
          onSave={() => {
            saveMenu();
            blocker.proceed();
          }}
          onDiscard={() => blocker.proceed()}
        />,
        getPopupRoot()
      )}
    </div>
  );
};

const newMenu = (forkId: string): CookingMenu => ({
  id: genId(),
  name: '',
  recipes: [],
  solidIngredients: [],
  reagentIngredients: [],
  lastFork: forkId,
});

const isMenuDirty = (
  initialMenu: CookingMenu,
  currentMenu: CookingMenu,
  initialHiddenIngredients: ReadonlySet<string>,
  currentHiddenIngredients: ReadonlySet<string>
): boolean => {
  if (initialMenu.name !== currentMenu.name) {
    return true;
  }
  if (
    initialMenu.recipes.length !== currentMenu.recipes.length ||
    initialMenu.recipes.some((x, i) => x !== currentMenu.recipes[i])
  ) {
    return true;
  }
  if (initialHiddenIngredients.size !== currentHiddenIngredients.size) {
    return true;
  }
  for (const x of initialHiddenIngredients) {
    if (!currentHiddenIngredients.has(x)) {
      return true;
    }
  }
  return false;
};

const ExampleNames = [
  'Favourite recipes',
  'Ultimate Cake Collection',
  'Burgers and Pizzas',
  'Soups, Stews, Salads and Stuff',
  'Assorted basics',
  'I have no botanist and I must cook',
];

interface ActionsProps {
  isNew: boolean;
  isDirty: boolean,
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}

const Actions = ({
  isNew,
  isDirty,
  onSave,
  onDiscard,
  onDelete,
}: ActionsProps): ReactElement =>
  <div className='planner_editor-actions'>
    <Tooltip text='Save the menu and close the editor'>
      <button onClick={onSave}>
        <SaveIcon/>
        <span>Save</span>
      </button>
    </Tooltip>

    <ConfirmButton
      tooltip={isNew
        ? 'Discard everything and return to the list'
        : 'Discard all changes and close the editor'
      }
      timeout={isDirty ? 400 : 150}
      onClick={onDiscard}
    >
      Discard
    </ConfirmButton>

    {!isNew && (
      <ConfirmButton tooltip='Delete the menu' onClick={onDelete}>
        Delete
      </ConfirmButton>
    )}
  </div>;
