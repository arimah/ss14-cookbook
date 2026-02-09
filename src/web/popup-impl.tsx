import {
  Dispatch,
  Ref,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

export type PopupPlacement =
  | 'above'
  | 'below'
  | 'left'
  | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface PopupTrigger<
  EPopup extends HTMLElement | SVGElement,
  EParent extends HTMLElement | SVGElement
> {
  visible: boolean;
  popupRef: Ref<EPopup>;
  parentRef: Ref<EParent>;
}

export interface PopupTriggerOptions {
  open?: boolean;
  intentTimeout?: number;
}

export function usePopupTrigger<
  EPopup extends HTMLElement | SVGElement,
  EParent extends HTMLElement | SVGElement = HTMLElement
>(
  placement: PopupPlacement,
  content?: any,
  {
    open: forceOpen,
    intentTimeout = 300,
  }: PopupTriggerOptions = {}
): PopupTrigger<EPopup, EParent> {
  const [visible, setVisible] = useState(false);

  const open = forceOpen ?? visible;

  const [parent, setParent] = useState<EParent | null>(null);

  useEffect(() => {
    if (!parent) {
      return;
    }

    const popup: PopupInstance = {
      trigger: parent,
      intentTimeout,
      setVisible,
    };

    register(popup);
    return () => unregister(popup);
  }, [parent, intentTimeout]);

  const popupRef = useRef<EPopup>(null);

  useEffect(() => {
    const popup = popupRef.current;
    if (!open || !popup || !parent) {
      return;
    }

    const { x, y } = placePopup(
      placement,
      parent.getBoundingClientRect(),
      popup.getBoundingClientRect()
    );

    popup.style.left = `${Math.round(x)}px`;
    popup.style.top = `${Math.round(y)}px`;
  }, [open, placement, parent, content]);

  return { visible: open, popupRef, parentRef: setParent };
}

type TriggerElement = HTMLElement | SVGElement;

interface PopupInstance {
  readonly trigger: TriggerElement;
  readonly intentTimeout: number;
  readonly setVisible: Dispatch<SetStateAction<boolean>>;
}

let currentPopup: PopupInstance | null = null;
let popupTimeoutId: number | null = null;
const popups = new Map<TriggerElement, PopupInstance>();

const enter = (popup: PopupInstance): void => {
  if (currentPopup !== popup) {
    // One popup at any given time
    leave();

    currentPopup = popup;
    if (popupTimeoutId === null) {
      popupTimeoutId = window.setTimeout(() => {
        popup.setVisible(true);
        popupTimeoutId = null;
      }, popup.intentTimeout);
    }
  }
};

const leave = (): void => {
  if (currentPopup) {
    if (popupTimeoutId !== null) {
      clearTimeout(popupTimeoutId);
      popupTimeoutId = null;
    }
    currentPopup.setVisible(false);
    currentPopup = null;
  }
};

const mouseMove = (e: MouseEvent): void => {
  let popup: PopupInstance | undefined = undefined;

  let node = e.target as ChildNode | null;
  while (node && !popup) {
    popup = popups.get(node as TriggerElement);
    node = node.parentElement;
  }

  if (popup) {
    enter(popup);
  } else {
    leave();
  }
};

const focus = (e: FocusEvent): void => {
  // Unlike mouse movements, we don't show a popup on focused descendants.
  // The exact popup trigger must be focused.
  const popup = popups.get(e.target as TriggerElement);
  if (popup) {
    enter(popup);
  } else {
    leave();
  }
};

const blur = (e: FocusEvent): void => {
  // relatedTarget is the target that's *gaining* focus. If we're moving from
  // one popup trigger to another, let focus handle it. Otherwise, close the
  // current popup.
  const nextPopup = popups.get(e.relatedTarget as TriggerElement);
  if (!nextPopup) {
    leave();
  }
};

const register = (inst: PopupInstance): void => {
  if (popups.size === 0) {
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('focusin', focus);
    window.addEventListener('focusout', blur);
    window.addEventListener('scroll', leave);
  }
  popups.set(inst.trigger, inst);
};

const unregister = (inst: PopupInstance): void => {
  popups.delete(inst.trigger);
  if (popups.size === 0) {
    window.removeEventListener('mousemove', mouseMove);
    window.removeEventListener('focusin', focus);
    window.removeEventListener('focusout', blur);
    window.removeEventListener('scroll', leave);
  }
  if (currentPopup === inst) {
    leave();
  }
};

/**
 * Places a popup relative to a parent element.
 * @param placement The relative location of the popup.
 * @param parentRect The parent element's location on screen.
 * @param popupRect The popup element's location on screen.
 * @param separation The distance between the popup element and the edge of
 *        the parent element.
 * @param screenMargin The minimum distance between the popup element and
 *        the edge of the screen.
 * @return The location of the popup's top left corner.
 */
export function placePopup(
  placement: PopupPlacement,
  parentRect: DOMRect,
  popupRect: DOMRect,
  separation = 6,
  screenMargin = 8
): Point {
  let x: number;
  switch (placement) {
    case 'above':
    case 'below':
      x = parentRect.x + (parentRect.width - popupRect.width) / 2;
      break;
    case 'left':
      x = parentRect.x - popupRect.width - separation;
      break;
    case 'right':
      x = parentRect.x + parentRect.width + separation;
      break;
  }
  x = clamp(
    x,
    screenMargin,
    window.innerWidth - popupRect.width - screenMargin
  );

  let y: number;
  switch (placement) {
    case 'above':
      y = parentRect.y - popupRect.height - separation;
      break;
    case 'below':
      y = parentRect.y + parentRect.height + separation;
      break;
    case 'left':
    case 'right':
      y = parentRect.y + (parentRect.height - popupRect.height) / 2;
      break;
  }
  y = clamp(
    y,
    screenMargin,
    window.innerHeight - popupRect.height - screenMargin
  );

  return { x, y };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

let root: HTMLElement | null = null;

export function getPopupRoot(): HTMLElement {
  if (!root) {
    root = document.createElement('div');
    root.dataset.purpose = 'popups';
    document.body.appendChild(root);
  }
  return root;
}
