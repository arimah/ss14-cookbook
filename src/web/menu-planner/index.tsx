import {memo} from 'react';
import {Outlet, RouteObject} from 'react-router-dom';

import {StoredMenuProvider} from './storage';
import {MenuList} from './list';
import {MenuViewer} from './view';
import {MenuEditor} from './edit';

export const MenuPlanner = memo((): JSX.Element => {
  return (
    <StoredMenuProvider>
      <main>
        <Outlet/>
      </main>
    </StoredMenuProvider>
  );
});

export const MenuPlannerRoutes: RouteObject[] = [
  {
    path: '',
    element: <MenuList/>,
  },
  {
    path: 'new',
    element: <MenuEditor/>,
  },
  {
    path: ':id/edit',
    element: <MenuEditor/>,
  },
  {
    path: ':id',
    element: <MenuViewer/>,
  },
];
