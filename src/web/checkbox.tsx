import {ChangeEvent, ReactElement, ReactNode, memo} from 'react';

export interface Props {
  className?: string;
  checked?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  children?: ReactNode;
}

export const Checkbox = memo((props: Props): ReactElement => {
  const {className, checked, onChange, children} = props;

  return (
    <label className={className ? `checkbox ${className}` : 'checkbox'}>
      <input type='checkbox' checked={checked} onChange={onChange}/>
      <span className='checkbox_marker'/>
      <span className='checkbox_label'>
        {children}
      </span>
    </label>
  );
});
