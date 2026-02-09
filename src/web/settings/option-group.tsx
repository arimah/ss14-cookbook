import { ChangeEvent, ReactElement, useId } from 'react';

export interface OptionGroupProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export interface Option<T extends string> {
  readonly name: string;
  readonly value: T;
}

export const OptionGroup = <T extends string>({
  options,
  value,
  onChange,
}: OptionGroupProps<T>): ReactElement => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onChange(e.target.value as T);
    }
  };

  const id = useId();

  return (
    <div className='settings_value'>
      {options.map(opt =>
        <label key={opt.value} className='settings_option'>
          <input
            className='settings_input'
            type='radio'
            name={id}
            value={opt.value}
            checked={opt.value === value}
            onChange={handleChange}
          />
          <span className='settings_marker'/>
          {opt.name}
        </label>
      )}
    </div>
  );
};
