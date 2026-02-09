import { ReactElement, cloneElement, useEffect, useRef } from 'react';
import { combineRefs } from '../helpers';
import { getLastPointerDownTarget, useManagedFocus } from './manager';
import {
  ElementChild,
  ElementSource,
  FocusScopeBehavior,
  FocusableElement,
  elementFromSource,
} from './types';
import { getNearestFocusable, tryFocus } from './utils';

export type Active = boolean | 'active' | 'paused' | 'disabled';

export interface FocusTrapProps {
  active?: Active;
  return?: boolean | ElementSource<FocusableElement>;
  onPointerDownOutside?: (target: Element) => void;
  children: ElementChild;
}

const isEnabled = (active: Active): boolean =>
  active === true || active === 'active' || active === 'paused';

const getBehavior = (active: Active): FocusScopeBehavior =>
  active === false || active === 'paused' || active === 'disabled'
    ? FocusScopeBehavior.PASSTHRU
    : FocusScopeBehavior.CONTAIN;

export const FocusTrap = ({
  active = true,
  return: restore = true,
  onPointerDownOutside,
  children,
}: FocusTrapProps): ReactElement => {
  const previousFocus = useRef(document.activeElement);

  const rootRef = useManagedFocus({
    behavior: getBehavior(active),
    onPointerDownOutside,
  });

  const returnTarget = useRef(restore);
  returnTarget.current = restore;

  const enabled = isEnabled(active);
  const lastEnabled = useRef(enabled);

  // We need to update the previous focus as early as possible: focus might
  // already have moved into the trap by the time the effect runs. Also, if
  // focus is *already inside* the focus trap, assume it was moved there
  // deliberately before activating the trap, and ignore it.
  if (
    !lastEnabled.current && enabled && !(
      rootRef.current &&
      rootRef.current.contains(document.activeElement)
    )
  ) {
    previousFocus.current = document.activeElement;
  }
  lastEnabled.current = enabled;

  useEffect(() => {
    if (enabled) {
      // When the focus scope is disabled or unmounted, we may need to
      // restore focus to the previously focused element.
      return () => {
        const { current: returnTo } = returnTarget;
        if (returnTo === false) {
          return;
        }

        tryFocus(
          returnTo !== true ? elementFromSource(returnTo) : null,
          getNearestFocusable(getLastPointerDownTarget()),
          previousFocus.current
        );
      };
    }
    return;
  }, [enabled]);

  const childWithRef = cloneElement(children, {
    ref: combineRefs(rootRef, children.props.ref),
  });
  return childWithRef;
};
