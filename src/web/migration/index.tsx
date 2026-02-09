import { ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowRightIcon } from '../icons';
import { useUrl } from '../url';
import { ExportSection } from './export-section';
import { ImportSection } from './import-section';

export const MigratePage = (): ReactElement => {
  const [query] = useSearchParams();

  const url = useUrl();

  if (query.has('import')) {
    return <ImportSection/>;
  }
  if (query.has('export')) {
    return <ExportSection/>;
  }

  let children: ReactElement;
  if (!CANONICAL_URL) {
    children = <>
      <p>The server has no configured address to migrate to.</p>
      <p>There is nothing further to do here. :)</p>
    </>;
  } else {
    const currentUrl = new URL(window.location.href);
    const canonicalUrl = new URL(CANONICAL_URL);
    if (currentUrl.host === canonicalUrl.host) {
      children = <p>Visit the old address if you want to migrate saved data (menus and favourite recipes).</p>;
    } else {
      children = <>
        <p>If you want to migrate your data to the new cookbook, you may do so:</p>
        <p>
          <Link to={url.migrateExport}>
            Export saved data <ArrowRightIcon/>
          </Link>
        </p>
      </>;
    }
  }

  return (
    <main>
      <section className='migrate'>
        <p>Hey, how did you get here?</p>
        {children}
        <p>
          <Link to={url.recipes} replace>
            Continue to cookbook <ArrowRightIcon/>
          </Link>
        </p>
      </section>
    </main>
  );
};
