import {
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
  cloneElement,
  useCallback,
  useRef,
} from 'react';
import { combineRefs } from './helpers';

export interface InputGroupProps {
  className?: string;
  iconBefore?: ReactNode;
  iconAfter?: ReactNode;
  children: ReactElement<{
    ref: Ref<HTMLInputElement>;
  }>;
}

export const InputGroup = ({
  className,
  iconBefore,
  iconAfter,
  children,
}: InputGroupProps): ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleMouseDown = useCallback((e: MouseEvent): void => {
    const input = inputRef.current;
    if (input && e.target !== input) {
      e.preventDefault();
      input.focus();
    }
  }, []);

  const ref = combineRefs(children.props.ref, inputRef);

  const childrenWithRef = cloneElement(children, { ref });

  return (
    <label
      className={className ? `input-group ${className}` : 'input-group'}
      onMouseDown={handleMouseDown}
    >
      {iconBefore}
      {childrenWithRef}
      {iconAfter}
    </label>
  );
};
