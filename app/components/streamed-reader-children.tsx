import { Children, isValidElement, useSyncExternalStore, type ReactNode } from "react";

// The server snapshot also applies when client scripts hydrate an already parsed document.
const subscribe = () => () => {};
const clientSnapshot = () => false;
const serverSnapshot = () => true;

function readChildren(children: ReactNode): void {
  if (children === null || typeof children !== "object") return;
  Children.forEach(children, child => {
    if (isValidElement<{ children?: ReactNode }>(child)) readChildren(child.props.children);
  });
}

export function StreamedReaderChildren({ children }: { children: ReactNode }) {
  // A pending Flight child must suspend a function fiber before a host claims
  // its DOM node. Replaying a claimed host can advance its cursor twice in the
  // pinned renderer (React #37584). Read only the already-projected children.
  const hydrating = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (hydrating && typeof document !== "undefined") readChildren(children);
  return children;
}
