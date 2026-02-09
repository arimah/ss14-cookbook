import { MouseEvent, ReactElement, ReactNode, memo, useMemo } from 'react';
import { Link, Outlet, useMatches } from 'react-router';
import { ForkData } from '../types';
import { Dropdown, DropdownOption } from './dropdown';
import { useFork } from './fork-context';
import { NoticeList } from './notices';
import { RouteHandle } from './routes';
import { SettingsButton } from './settings';
import { UrlGenerator, useUrl } from './url';

interface HeaderTab {
  readonly id: string;
  readonly target: (url: UrlGenerator) => string;
  readonly label: string;
}

const HeaderTabs: readonly HeaderTab[] = [
  {
    id: 'recipe-list',
    target: url => url.recipes,
    label: 'All Recipes',
  },
  {
    id: 'food-sequence',
    target: url => url.foodSequence,
    label: 'Combinations',
  },
  {
    id: 'menu-planner',
    target: url => url.menuList,
    label: 'Menu Planner',
  },
];

export const Cookbook = (): ReactElement => {
  const { fork, allForks, setFork } = useFork();

  const routes = useMatches();
  const url = useUrl();

  return <>
    <NoticeList currentFork={fork}/>
    <header className='tabs'>
      <div className='tabs_list'>
        {HeaderTabs.map(tab =>
          <Tab
            key={tab.id}
            target={tab.target(url)}
            selected={routes.some(r => (r.handle as RouteHandle)?.name === tab.id)}
          >
            {tab.label}
          </Tab>
        )}
      </div>
      <div className='tabs_secondary'>
        <ForkSwitcher value={fork} allForks={allForks} onSetFork={setFork}/>
        <SettingsButton/>
      </div>
    </header>
    <Outlet/>
  </>;
};

interface TabProps {
  target: string;
  selected: boolean;
  children: ReactNode;
}

const Tab = memo(({
  target,
  selected,
  children,
}: TabProps): ReactElement => {
  return (
    <Link
      to={target}
      className={
        selected
          ? 'btn tabs_tab tabs_tab--current'
          : 'btn tabs_tab'
      }
      onClick={handleClickTab}
    >
      {children}
    </Link>
  );
});

const handleClickTab = (e: MouseEvent<HTMLAnchorElement>): void => {
  e.currentTarget.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
};

interface ForkSwitcherProps {
  value: string;
  allForks: readonly ForkData[];
  onSetFork: (value: string) => void;
}

const ForkSwitcher = memo(({
  value,
  allForks,
  onSetFork,
}: ForkSwitcherProps): ReactElement => {
  const options = useMemo<DropdownOption[]>(() => {
    return allForks
      .filter(data => !data.hidden || data.id === value)
      .map(data => ({
        name: data.name,
        value: data.id,
        description: data.description,
      }));
  }, [allForks, value]);

  return (
    <Dropdown
      className='tabs_fork'
      value={value}
      prefix='Fork: '
      options={options}
      onChange={onSetFork}
    />
  );
});
