import { ReactElement, ReactNode, useEffect } from 'react';

export interface Props {
  children: ReactNode;
}

export const Overlay = ({ children }: Props): ReactElement => {
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
