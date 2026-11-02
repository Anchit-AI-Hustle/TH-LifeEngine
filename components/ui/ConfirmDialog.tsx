"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Info, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** May return a promise; the dialog shows a busy state until it settles. */
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  details?: React.ReactNode;
  /** Where focus goes on close when the element that opened the dialog is gone (e.g. a deleted row). */
  fallbackFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal confirmation. Accessible: alertdialog role, focus moves to Cancel,
 * Tab stays inside, Escape and the backdrop cancel, and focus returns to the
 * element that opened it.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  details,
  fallbackFocusRef,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const fallbackRef = useRef(fallbackFocusRef);
  fallbackRef.current = fallbackFocusRef;

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const html = document.documentElement;
    const addedNavOpen = !html.classList.contains("nav-open");
    // Hides the floating portfolio launchers so they cannot cover the buttons.
    if (addedNavOpen) html.classList.add("nav-open");
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (addedNavOpen) html.classList.remove("nav-open");
      // Wait a frame so the page can re-render (a deleted row disappears) first.
      requestAnimationFrame(() => {
        if (opener && opener.isConnected) opener.focus();
        else fallbackRef.current?.current?.focus();
      });
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleConfirm = async () => {
    busyRef.current = true;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      busyRef.current = false;
      setBusy(false);
      onClose();
    }
  };

  const Icon = variant === "danger" ? TriangleAlert : Info;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-gray-900/50 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-gray-900/5"
      >
        <div className="flex gap-4 p-5 sm:p-6">
          <span
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              variant === "danger" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-gray-900">
              {title}
            </h2>
            <div id={messageId} className="mt-1.5 text-sm leading-relaxed text-gray-600">
              {message}
            </div>
            {details ? <div className="mt-4">{details}</div> : null}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button ref={cancelRef} type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button type="button" variant={variant} onClick={handleConfirm} disabled={busy} aria-busy={busy || undefined}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
