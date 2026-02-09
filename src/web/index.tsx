import { enableMapSet } from 'immer';
import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { App } from './app';
import { FetchError } from './fetch-error';
import './index.css';
import { AppRoutes } from './routes';
import { SettingsProvider } from './settings';

const IndexPath = `${BASE_PATH}/data/index.json`;

const ForkListLoader = (): ReactElement => {
  // This is a pretty bad implementation.
  // TODO: Maybe move things to a ForkListContext or something.
  const [children, setChildren] = useState<ReactNode>('Loading...');

  useEffect(() => {
    fetch(IndexPath, { cache: 'reload' })
      .then(res => res.json())
      .then(
        index => {
          const router = createBrowserRouter([
            {
              element: <App forks={index}/>,
              children: AppRoutes,
            }
          ], {
            basename: BASE_PATH,
          });
          setChildren(<RouterProvider router={router}/>);
        },
        err => {
          console.error('Error loading fork list:', err);
          setChildren(
            <FetchError
              message='Something went wrong when loading the list of forks.'
            />
          );
        }
      );
  }, []);

  return (
    <SettingsProvider>
      {children}
    </SettingsProvider>
  );
};

// Why do you make it so hard for me to love you, Immer?
enableMapSet();

const appRoot = document.getElementById('app-root')!;
createRoot(appRoot).render(<ForkListLoader/>);
