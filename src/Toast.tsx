import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ToastProps = {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  durationMs?: number;
  variant?: "success" | "error";
};

export function Toast({
  open,
  title,
  description,
  onClose,
  durationMs = 6000,
  variant = "success",
}: ToastProps) {
  const isError = variant === "error";
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);

  const finishDismiss = useCallback(() => {
    setMounted(false);
    setLeaving(false);
    onClose();
  }, [onClose]);

  const beginDismiss = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishDismiss();
      return;
    }
    setLeaving(true);
  }, [finishDismiss]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mounted || leaving || durationMs <= 0) return;
    dismissTimerRef.current = window.setTimeout(beginDismiss, durationMs);
    return () => {
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    };
  }, [open, mounted, leaving, durationMs, beginDismiss]);

  function handleAnimationEnd(event: React.AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !leaving) return;
    finishDismiss();
  }

  if (!mounted) return null;

  return createPortal(
    <div className="toast-viewport" role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"}>
      <div
        className={`toast-notification${leaving ? " is-leaving" : ""}`}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="toast-notification-body">
          <div className="toast-notification-icon" aria-hidden>
            <span className={`toast-featured-icon${isError ? " toast-featured-icon--error" : ""}`}>
              {isError ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M10 18.333a8.333 8.333 0 1 0 0-16.667 8.333 8.333 0 0 0 0 16.667Z"
                    stroke="#D92D20"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 8.333V11.667"
                    stroke="#D92D20"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 14.167h.008"
                    stroke="#D92D20"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M10 18.333a8.333 8.333 0 1 0 0-16.667 8.333 8.333 0 0 0 0 16.667Z"
                    stroke="#039855"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.458 10l2.292 2.292L13.542 7.5"
                    stroke="#039855"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </div>
          <div className="toast-notification-text">
            <p className="toast-notification-title">{title}</p>
            <p className="toast-notification-description">{description}</p>
          </div>
        </div>
        <button
          type="button"
          className="toast-notification-close"
          aria-label="Dismiss notification"
          onClick={beginDismiss}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M15 5 5 15M5 5l10 10" stroke="#262527" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
