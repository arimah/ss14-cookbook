import {useCallback, useEffect, useMemo, useState} from 'react';
import {Outlet, useSearchParams} from 'react-router-dom';

import {ForkData, GameData} from '../types';

import {FetchError} from './fetch-error';
import {GameDataProvider} from './context';
import {FavoritesProvider} from './favorites';
import {RecipeExplorerProvider} from './recipe-explorer';
import {AttributionsLink} from './attributions';
import {CanonicalRedirect} from './canonical-redirect';
import {PrivacyPolicyLink} from './privacy';
import {GitHubCommitUrl} from './helpers';
import {NoticesProvider} from './notices';
import {ForkProvider} from './fork-context';
import {UrlProvider} from './url';
import {NoticeData} from './types';

export interface Props {
  forks: readonly ForkData[];
}

const NoticesPath = `${BASE_PATH}/data/notices.json`;

const ForkDataPath = (id: string, hash: string) =>
  `${BASE_PATH}/data/data_${id}.${hash}.json`;

export const App = (props: Props): JSX.Element => {
  const {forks} = props;

  const [query, setQuery] = useSearchParams();

  const queryFork = query.get('fork');
  const fork = useMemo(() => {
    return findCurrentFork(queryFork, forks);
  }, [queryFork, forks]);

  const [data, setData] = useState<GameData | null>(null);
  const [notices, setNotices] = useState<NoticeData[] | null>(null);
  const [error, setError] = useState(false);

  const handleSetFork = useCallback((nextFork: string) => {
    const isDefaultFork = forks.some(f => f.id === nextFork && f.default);
    setQuery(prevQuery => {
      const nextQuery = new URLSearchParams(prevQuery);
      if (isDefaultFork) {
        nextQuery.delete('fork');
      } else {
        nextQuery.set('fork', nextFork);
      }
      return nextQuery;
    });
  }, [setQuery]);

  const forkData = forks.find(f => f.id === fork)!;
  useEffect(() => {
    fetch(ForkDataPath(forkData.id, forkData.hash))
      .then(res => res.json())
      .catch(err => {
        console.error('Error fetching game data:', err);
        setError(true);
      })
      .then((data: GameData) => {
        setData(data);
        document.body.style.setProperty(
          '--sprite-url',
          `url('${BASE_PATH}/img/${data.spriteSheet}')`
        );
      });

    fetch(NoticesPath, {cache: 'reload'})
      .then(res => res.json())
      .catch(err => {
        console.error('Error fetching notices:', err);
        return [];
      })
      .then(setNotices);
  }, [forkData]);

  if (error) {
    return (
      <FetchError message='Something went wrong when loading recipe data.'/>
    );
  }

  if (!data || !notices) {
    return <p>Loading...</p>
  }

  const meta = forkData.meta;
  const commitLink = GitHubCommitUrl(meta.repo, meta.commit);

  return (
    <UrlProvider>
      <NoticesProvider all={notices}>
        <GameDataProvider forkId={fork} raw={data}>
          <ForkProvider fork={fork} allForks={forks} setFork={handleSetFork}>
            <FavoritesProvider>
              <RecipeExplorerProvider>
                <Outlet/>
              </RecipeExplorerProvider>
            </FavoritesProvider>
          </ForkProvider>
          <footer>
            <p>
              {'Recipes generated from commit '}
              <a href={commitLink} target='_blank' rel='noopener'>
                {meta.commit.slice(0, 9)}
              </a>
              {` on ${formatDate(meta.date)}.`}
            </p>
            <p>
              Made by Alice Heurlin / Arimah, 2024.
              {' '}
              Discord: @arimah.
              {' '}
              GitHub: <a href='https://github.com/arimah' target='_blank' rel='noopener'>arimah</a>.
            </p>
            <p>
              {'Sprites were made by many contributors: '}
              <AttributionsLink value={data.attributions} meta={meta}/>
              {'.'}
            </p>
            <p>
              <PrivacyPolicyLink/>
              {' • '}
              <a href={REPO_URL} target='_blank' rel='noopener'>Source code</a>
            </p>
          </footer>
          <CanonicalRedirect/>
        </GameDataProvider>
      </NoticesProvider>
    </UrlProvider>
  );
};

const findCurrentFork = (
  queryFork: string | null,
  allForks: readonly ForkData[],
): string => {
  // If there is a fork matching the query string fork exactly, use it.
  if (
    queryFork !== null &&
    allForks.some(f => f.id === queryFork)
  ) {
    return queryFork;
  }

  // Otherwise, find the first fork with `default: true`.
  let defaultFork = allForks.find(f => f.default)?.id;
  if (!defaultFork) {
    // If there is no such fork (unexpected!), use the first in the list.
    defaultFork = allForks[0].id;
  }
  return defaultFork;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} at ${hour}:${minute}:${second}`;
};
