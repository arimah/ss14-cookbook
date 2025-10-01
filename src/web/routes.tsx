import {Cookbook} from './main';
import {RecipeList} from './recipe-list';
import {FoodSequences} from './food-sequence';
import {MenuPlanner, MenuPlannerRoutes} from './menu-planner';
import {MigratePage} from './migration';

export interface RouteHandle {
  readonly name: string;
}

export const AppRoutes = [
  {
    element: <Cookbook/>,
    children: [
      {
        path: '/',
        element: <RecipeList/>,
        handle: {name: 'recipe-list'} satisfies RouteHandle,
      },
      {
        path: '/combinations',
        element: <FoodSequences/>,
        handle: {name: 'food-sequence'} satisfies RouteHandle,
      },
      {
        path: '/menu',
        element: <MenuPlanner/>,
        children: MenuPlannerRoutes,
        handle: {name: 'menu-planner'} satisfies RouteHandle,
      },
      {
        path: '/migrate',
        element: <MigratePage/>,
        handle: {name: 'migrate'} satisfies RouteHandle,
      },
    ],
  },
];
