import {ReactElement, ReactNode, useEffect} from 'react';

export interface Props {
  children: ReactNode;
}

export const Overlay = (props: Props): ReactElement => {
  const {children} = props;

  useEffect(() => {
    document.body.classList.add('overlay-open');
    return () => {
      document.body.classList.remove('overlay-open');
    };
  }, []);

  return (
    <div className='overlay'>
      {children}
    </div>
  );
};
