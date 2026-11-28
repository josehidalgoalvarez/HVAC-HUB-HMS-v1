import { useState, useCallback } from 'react';

export interface UseModalStateResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  submitting: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  submit: (fn: () => Promise<void>, fallbackMessage?: string) => Promise<void>;
}

/**
 * Shared modal lifecycle hook managing open/close visibility, in-flight submit state, and inline errors.
 */
export function useModalState(): UseModalStateResult {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(() => {
    setError(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const submit = useCallback(
    async (fn: () => Promise<void>, fallbackMessage = 'Something went wrong') => {
      setSubmitting(true);
      setError(null);
      try {
        await fn();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : fallbackMessage);
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return { isOpen, open, close, submitting, error, setError, submit };
}
