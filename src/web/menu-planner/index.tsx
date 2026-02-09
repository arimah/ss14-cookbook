import { ReactElement, memo } from 'react';
import { Outlet, RouteObject } from 'react-router';
import { MenuEditor } from './edit';
import { MenuList } from './list';
import { StoredMenuProvider } from './storage';
import { MenuViewer } from './view';

export const MenuPlanner = memo((): ReactElement => {
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
