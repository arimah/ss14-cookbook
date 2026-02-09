import {
  KeyboardEvent,
  ReactElement,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { DropdownList, DropdownListItem } from './dropdown-list';
import { DropdownIcon } from './icons';

export interface Props {
  className?: string;
  icon?: ReactNode;
  value: string;
  options: DropdownOption[];
  prefix?: string;
  extraItems?: DropdownExtraItem[];
  onChange: (value: string) => void;
}

export interface DropdownOption {
  readonly value: string;
  readonly name: string;
  readonly description?: string;
}

export interface DropdownExtraItem {
  readonly name: string;
  readonly checked?: boolean;
  readonly description?: string;
  readonly activate: (close: () => void) => void;
}

export const Dropdown = ({
  className,
  icon,
  value,
  options,
  prefix,
  extraItems,
  onChange,
}: Props): ReactElement => {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const index = options.findIndex(opt => opt.value === value);
    switch (e.code) {
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          onChange(options[index - 1].value);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (index < options.length - 1) {
          onChange(options[index + 1].value);
        }
        break;
      case 'Home':
      case 'PageUp':
        e.preventDefault();
        onChange(options[0].value);
        break;
      case 'End':
      case 'PageDown':
        e.preventDefault();
        onChange(options[options.length - 1].value);
        break;
    }
  }, [value, options]);

  const ddItems: DropdownListItem[] | null = useMemo(() => {
    if (!open) {
      return null;
    }

    let items: DropdownListItem[] = options.map(opt => ({
      name: opt.name,
      description: opt.description,
      activate: close => {
        onChange(opt.value);
        close();
      },
    }));
    if (extraItems && extraItems.length > 0) {
      items.push({ separator: true });
      items = items.concat(extraItems);
    }
    return items;
  }, [open, options, extraItems, onChange]);

  let realClassName = open ? 'dropdown dropdown--open' : 'dropdown';
  if (className) {
    realClassName = `${realClassName} ${className}`;
  }

  return (
    <div className={realClassName}>
      <button
        className='dropdown_trigger'
        aria-haspopup='menu'
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(true)}
      >
        {icon}
        {prefix && <span className='dropdown_prefix'>{prefix}</span>}
        <span className='dropdown_label'>
          {options.map(opt =>
            <span
              key={opt.value}
              className={opt.value === value ? 'current' : undefined}
            >
              {opt.name}
            </span>
          )}
        </span>
        <DropdownIcon className='dropdown_arrow'/>
      </button>
      {ddItems && (
        <DropdownList
          initialIndex={options.findIndex(opt => opt.value === value)}
          items={ddItems}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
};
