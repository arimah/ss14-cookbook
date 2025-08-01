import {Cookbook} from './main';
import {RecipeList} from './recipe-list';
import {MenuPlanner, MenuPlannerRoutes} from './menu-planner';

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
        path: '/menu',
        element: <MenuPlanner/>,
        children: MenuPlannerRoutes,
        handle: {name: 'menu-planner'} satisfies RouteHandle,
      },
    ],
  },
];
