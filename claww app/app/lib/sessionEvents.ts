// Tells screens that a finished session has been saved (its "completed" day event exists), so they reload
// instead of showing the session as still to do. Home loads on focus, which can run before the save lands.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onSessionSaved(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitSessionSaved(): void {
  listeners.forEach((fn) => fn());
}
