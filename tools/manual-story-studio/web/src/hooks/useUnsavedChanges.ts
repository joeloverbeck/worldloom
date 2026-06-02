import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

export interface UseUnsavedChangesOptions {
  enabled?: boolean;
  message?: string;
  resetKeys?: readonly unknown[];
}

const DEFAULT_MESSAGE =
  "You have unsaved changes. Leave this page and discard them?";

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

export function useUnsavedChanges(
  currentValue: unknown,
  options: UseUnsavedChangesOptions = {},
): { dirty: boolean; reset: () => void } {
  const enabled = options.enabled ?? true;
  const message = options.message ?? DEFAULT_MESSAGE;
  const resetKey = useMemo(
    () => serialize(options.resetKeys ?? []),
    [options.resetKeys],
  );
  const currentSerialized = useMemo(
    () => serialize(currentValue),
    [currentValue],
  );

  const currentRef = useRef(currentSerialized);
  const savedRef = useRef(currentSerialized);
  const enabledRef = useRef(enabled);
  const allowNextNavigationRef = useRef(false);
  const [savedSerialized, setSavedSerialized] = useState(currentSerialized);

  currentRef.current = currentSerialized;
  enabledRef.current = enabled;
  savedRef.current = savedSerialized;

  useEffect(() => {
    savedRef.current = currentRef.current;
    setSavedSerialized(currentRef.current);
  }, [resetKey]);

  const dirty = enabled && currentSerialized !== savedSerialized;

  const reset = useCallback(() => {
    allowNextNavigationRef.current = true;
    savedRef.current = currentRef.current;
    setSavedSerialized(currentRef.current);
    queueMicrotask(() => {
      allowNextNavigationRef.current = false;
    });
  }, []);

  const blocker = useBlocker(
    useCallback(() => {
      return (
        enabledRef.current &&
        currentRef.current !== savedRef.current &&
        !allowNextNavigationRef.current
      );
    }, []),
  );

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(message)) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, message]);

  return { dirty, reset };
}
