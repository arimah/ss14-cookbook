import {
  KeyboardEvent,
  memo,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FocusTrap } from './focus';

export interface Props {
  className?: string;
  initialIndex: number;
  items: DropdownListItem[];
  onClose: () => void;
}

export type DropdownListItem = Item | Separator;

export interface Item {
  readonly separator?: false;
  readonly checked?: boolean;
  readonly name: string;
  readonly description?: string;
  readonly activate: (close: () => void) => void;
}

export interface Separator {
  readonly separator: true;
}

export const DropdownList = memo(({
  className,
  initialIndex,
  items,
  onClose,
}: Props): ReactElement => {
  const [index, setIndex] = useState(initialIndex);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':
        e.preventDefault();
        setIndex(tryAdjustIndex(index, -1, items));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setIndex(tryAdjustIndex(index, 1, items));
        break;
      case 'Home':
      case 'PageUp': {
        e.preventDefault();
        const firstIndex = items.findIndex(isNotSeparator);
        setIndex(firstIndex);
        break;
      }
      case 'End':
      case 'PageDown': {
        e.preventDefault();
        const lastIndex = items.findLastIndex(isNotSeparator);
        setIndex(lastIndex);
        break;
      }
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Space':
      case 'Enter':
        e.preventDefault();
        const item = items[index];
        if (!item.separator) {
          item.activate(onClose);
        }
        break;
    }
  }, [index, items, onClose]);

  const hasCheckedItem = items.some(x => !x.separator && x.checked != null);
  let realClassName = hasCheckedItem
    ? `dropdown_list dropdown_list--icon`
    : 'dropdown_list';
  if (className) {
    realClassName = `${realClassName} ${className}`;
  }

  return (
    <FocusTrap onPointerDownOutside={onClose}>
      <div
        className={realClassName}
        role='menu'
        tabIndex={0}
        onKeyDown={handleKeyDown}
        ref={ref}
      >
        {items.map((item, i) => item.separator ? (
          <div key={i} className='dropdown_sep'/>
        ) : (
          <div
            key={i}
            className={
              i === index
                ? 'dropdown_item dropdown_item--current'
                : 'dropdown_item'
            }
            onMouseEnter={() => setIndex(i)}
            onClick={() => item.activate(onClose)}
          >
            {item.checked != null && (
              <span className='dropdown_icon'>
                <span
                  className={
                    item.checked
                      ? 'checkbox_marker checkbox_marker--checked'
                      : 'checkbox_marker'
                  }
                />
              </span>
            )}
            <span className='dropdown_item-name'>
              {item.name}
            </span>
            {item.description != null && (
              <span className='dropdown_item-desc'>
                {item.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </FocusTrap>
  );
});

const isNotSeparator = (item: DropdownListItem) => !item.separator;

const tryAdjustIndex = (
  index: number,
  delta: -1 | 1,
  items: readonly DropdownListItem[]
): number => {
  let nextIndex = index + delta;
  for (;;) {
    if (nextIndex === -1 || nextIndex === items.length) {
      break;
    }
    if (!items[nextIndex].separator) {
      return nextIndex;
    }
    nextIndex += delta;
  }

  // No change
  return index;
};
