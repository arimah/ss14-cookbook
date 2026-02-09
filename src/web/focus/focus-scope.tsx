import { ReactElement, cloneElement } from 'react';
import { combineRefs } from '../helpers';
import { useManagedFocus } from './manager';
import { ElementChild, FocusScopeBehavior } from './types';

export interface FocusScopeProps {
  active?: boolean;
  children: ElementChild;
}

const getBehavior = (active: boolean): FocusScopeBehavior =>
  active ? FocusScopeBehavior.PASSTHRU : FocusScopeBehavior.EXCLUDE;

export const FocusScope = ({
  active = true,
  children,
}: FocusScopeProps): ReactElement => {
  const rootRef = useManagedFocus({
    behavior: getBehavior(active),
  });

  const childWithRef = cloneElement(children, {
    ref: combineRefs(rootRef, children.props.ref),
  });
  return childWithRef;
};
