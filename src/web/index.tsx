import {createRoot} from 'react-dom/client';
import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import {enableMapSet} from 'immer';

import {App} from './app';
import {FetchError} from './fetch-error';
import {AppRoutes} from './routes';
import './index.css';

const IndexPath = `${BASE_PATH}/data/index.json`;

// Why do you make it so hard for me to love you, Immer?
enableMapSet();

const appRoot = document.getElementById('app-root')!;
fetch(IndexPath, {cache: 'reload'})
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
      createRoot(appRoot).render(<RouterProvider router={router}/>);
    },
    err => {
      console.error('Error loading fork list:', err);
      createRoot(appRoot).render(
        <FetchError
          message='Something went wrong when loading the list of forks.'
        />
      );
    }
  );
