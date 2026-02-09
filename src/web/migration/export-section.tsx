import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { intersperse } from '../helpers';
import { ArrowRightIcon } from '../icons';
import { Notice } from '../notices';
import { AllStorageKeys } from '../storage';
import { UrlGenerator, useUrl } from '../url';

type ExportState =
  | NotAvailableState
  | AlreadyCanonicalState
  | LoadingState
  | NoDataState
  | ReadyState
  | ErrorState
  ;

interface NotAvailableState {
  readonly type: 'notAvailable';
}
const NotAvailableState: NotAvailableState = { type: 'notAvailable' };

interface AlreadyCanonicalState {
  readonly type: 'alreadyCanonical';
}
const AlreadyCanonicalState: AlreadyCanonicalState = { type: 'alreadyCanonical' };

interface LoadingState {
  readonly type: 'loading';
}
const LoadingState: LoadingState = { type: 'loading' };

interface NoDataState {
  readonly type: 'noData';
}
const NoDataState: NoDataState = { type: 'noData' };

interface ReadyState {
  readonly type: 'ready';
  readonly targetUrl: string;
}

interface ErrorState {
  readonly type: 'error';
  readonly targetUrl: string | null;
  readonly failedKeys: readonly string[];
}

const RedirectTimeout = 1000; // ms

export const ExportSection = (): ReactElement => {
  const [state, setState] = useState(getInitialState);

  const url = useUrl();
  useEffect(() => {
    switch (state.type) {
      case 'loading':
        setState(prepareExport(url));
        break;
      case 'ready': {
        const timeoutId = window.setTimeout(() => {
          window.location.href = state.targetUrl;
        }, RedirectTimeout);
        return () => window.clearTimeout(timeoutId);
      }
    }
  }, [state]);

  let children: ReactElement;
  switch (state.type) {
    case 'notAvailable':
      children = <>
        <p>Data exports are not available: no <code>{'CANONICAL_URL'}</code> is configured.</p>
        <p>If you are the owner of this cookbook, see <code>.env.example</code> for information on how to enable redirects and exports.</p>
      </>;
      break;
    case 'alreadyCanonical':
      children = <>
        <p>You’re already on the correct page!</p>
        <p>Please visit the old cookbook if you wish to export your data.</p>
      </>;
      break;
    case 'loading':
      children = <p>Preparing export...</p>;
      break;
    case 'noData':
      children =
        <Notice kind='info'>
          You don’t appear to have any data to export!
        </Notice>;
      break;
    case 'ready':
      children = <>
        <p>Export ready. Redirecting to the new address...</p>
        <p>If you don’t get redirected automatically in a few seconds, click here:</p>
        <p>
          {/* Explicitly no `rel='noreferrer'`: we need the target URL to have
            * a valid referrer.
            */}
          <a href={state.targetUrl}>
            Continue with export <ArrowRightIcon/>
          </a>
        </p>
      </>;
      break;
    case 'error':
      children = <>
        <Notice kind='error'>
          Something went wrong when preparing your data.
        </Notice>
        <p>
          {'The following data could not be exported: '}
          {intersperse<ReactNode>(
            state.failedKeys.map(key => <i key={key}>{key}</i>),
            ', '
          )}
        </p>
        {state.targetUrl !== null && <>
          <p>You can continue manually if you wish:</p>
          <p>
            <a href={state.targetUrl}>
              Continue with partial export <ArrowRightIcon/>
            </a>
          </p>
        </>}
      </>;
      break;
  }

  return (
    <main>
      <section className='migrate'>
        {children}
      </section>
    </main>
  );
};

const getInitialState = (): ExportState => {
  if (!CANONICAL_URL) {
    return NotAvailableState;
  }

  const currentUrl = new URL(window.location.href);
  const canonicalUrl = new URL(CANONICAL_URL);
  if (currentUrl.host === canonicalUrl.host) {
    return AlreadyCanonicalState;
  }

  return LoadingState;
};

const prepareExport = (url: UrlGenerator): ExportState => {
  const data: Record<string, unknown> = {};
  const exportedKeys: string[] = [];
  const failedKeys: string[] = [];

  for (const key of AllStorageKeys) {
    let value: unknown;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) {
        // No data at this key
        continue;
      }

      value = JSON.parse(raw);
      exportedKeys.push(key);
    } catch (e) {
      console.warn(`prepareExport: ${key}: error reading local storage:`, e);
      failedKeys.push(key);
      continue;
    }

    data[key] = value;
  }

  const targetUrl = exportedKeys.length > 0
    ? `${CANONICAL_URL!}${url.migrateImport(JSON.stringify(data))}`
    : null;

  if (failedKeys.length > 0) {
    return { type: 'error', failedKeys, targetUrl };
  }
  if (!targetUrl) {
    return NoDataState;
  }
  return { type: 'ready', targetUrl };
};
