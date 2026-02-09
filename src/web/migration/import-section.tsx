import { ReactElement, ReactNode, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { intersperse, joinListNatural } from '../helpers';
import { ArrowRightIcon } from '../icons';
import { Notice } from '../notices';
import { AllStorageKeys } from '../storage';
import { useUrl } from '../url';

type ImportState =
  | LoadingState
  | MissingDataState
  | SuccessState
  | UntrustedDataState
  | ErrorState
  ;

interface LoadingState {
  readonly type: 'loading';
}
const LoadingState: LoadingState = { type: 'loading' };

interface MissingDataState {
  readonly type: 'missingData';
}
const MissingDataState: MissingDataState = { type: 'missingData' };

interface SuccessState {
  readonly type: 'success';
}
const SuccessState: SuccessState = { type: 'success' };

interface UntrustedDataState {
  readonly type: 'untrustedData';
  readonly data: Record<string, unknown>;
}

interface ErrorState {
  readonly type: 'error';
  readonly message: string | null;
  readonly failedKeys: readonly string[];
  readonly importedKeys: readonly string[];
}

const TrustedHosts = TRUSTED_HOSTS;

export const ImportSection = (): ReactElement => {
  const [query] = useSearchParams();

  const url = useUrl();

  const [state, setState] = useState<ImportState>(LoadingState);

  useEffect(() => {
    if (state.type === 'loading') {
      setState(prepareImport(query));
    }
  }, [state]);

  let children: ReactElement;
  switch (state.type) {
    case 'loading':
      children = <p>Importing...</p>;
      break;
    case 'missingData':
      children = <>
        <Notice kind='warning'>
          Hmmm, looks like the URL doesn’t contain any importable data.
        </Notice>
        <p>You can go back and retry the export. If it still doesn’t work, please report the error.</p>
      </>;
      break;
    case 'success':
      children = <>
        <p>Everything was imported successfully!</p>
        <p>You may need to reload the page to see the change.</p>
        <p>
          <Link to={url.recipes} replace>
            Continue to cookbook <ArrowRightIcon/>
          </Link>
        </p>
      </>;
      break;
    case 'untrustedData': {
      const { data } = state;
      children = <>
        <Notice kind='warning'>
          Couldn’t verify this data came from a trusted source.
        </Notice>
        {TrustedHosts.length > 0 ? (
          <p>
            {'It was not possible to verify that this request came from '}
            {joinListNatural(TrustedHosts, ', ', ' or ')}.
          </p>
        ) : (
          <p>This website has no trusted sources configured.</p>
        )}
        <p>
          If you did not initiate the migration or get a link from a trusted friend, you should probably abort.
          {' '}
          If you continue with the import, <strong>existing data will be overwritten</strong>.
          {' '}
          Proceed with the import at your own risk.
        </p>
        <p>
          <button onClick={() => setState(performImport(data))}>
            Import data anyway
          </button>
          {' '}
          <Link to={url.recipes} replace className='btn'>
            Abort import
          </Link>
        </p>
      </>;
      break;
    }
    case 'error':
      children = <>
        <Notice kind='error'>
          Something went wrong when importing your data.
        </Notice>
        {state.message != null && (
          <p>The error message was: {state.message}</p>
        )}
        {state.failedKeys.length > 0 && (
          <p>
            {'The following data could not be imported: '}
            {intersperse<ReactNode>(
              state.failedKeys.map(key => <i key={key}>{key}</i>),
              ', '
            )}
          </p>
        )}
        {state.importedKeys.length > 0 && (
          <p>
            {'The following data was imported successfully: '}
            {intersperse<ReactNode>(
              state.importedKeys.map(key => <i key={key}>{key}</i>),
              ', '
            )}
          </p>
        )}
        <p>It may help to reload the page to try again.</p>
        <p>
          <button onClick={() => window.location.reload()}>
            Reload page
          </button>
        </p>
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

const prepareImport = (query: URLSearchParams): ImportState => {
  const dataRaw = query.get('data');
  if (!dataRaw) {
    return MissingDataState;
  }

  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(dataRaw);
    if (
      parsed == null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {
        type: 'error',
        message: 'The provided data is not in the right format.',
        failedKeys: [],
        importedKeys: [],
      };
    }

    data = parsed;
  } catch (e) {
    return {
      type: 'error',
      message: e instanceof Error ? e.message : String(e),
      failedKeys: [],
      importedKeys: [],
    };
  }

  if (isTrustedReferrer()) {
    return performImport(data) ?? SuccessState;
  }
  return { type: 'untrustedData', data };
};

const performImport = (data: Record<string, unknown>): SuccessState | ErrorState => {
  const importedKeys: string[] = [];
  const failedKeys: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (!AllStorageKeys.includes(key)) {
      // Skip unknown key
      continue;
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`prepareImport: ${key}: error writing to localStorage:`, e);
      failedKeys.push(key);
    }
  }

  if (failedKeys.length > 0) {
    return {
      type: 'error',
      message: null,
      failedKeys,
      importedKeys,
    };
  }
  return SuccessState;
};

const isTrustedReferrer = (): boolean => {
  if (!document.referrer) {
    return false;
  }
  const referrer = new URL(document.referrer);
  return TrustedHosts.includes(referrer.host);
};
