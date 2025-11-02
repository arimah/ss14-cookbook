import {ReactElement} from 'react';

export interface FetchErrorProps {
  message: string;
}

export const FetchError = (props: FetchErrorProps): ReactElement => {
  const {message} = props;
  return <>
    <p>{message} :(</p>
    <p>
      It may help to reload the page.
      {' '}
      If the problem persists, contact me on Discord (@arimah) or Telegram (
        <a href='https://t.me/arimah42' target='_blank' rel='noopener'>@arimah42</a>
      ).
    </p>
  </>;
}
