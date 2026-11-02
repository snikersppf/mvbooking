"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "@/components/i18n/language-provider";
import styles from "./vehicle-photo.module.css";

type VehiclePhotoProps = Readonly<{
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}>;

export function VehiclePhoto({ src, alt, width, height, className = "" }: VehiclePhotoProps) {
  const t = useTranslations();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const isOpen = phase !== "closed";

  const mountDialog = useCallback((node: HTMLDialogElement | null) => {
    dialog.current = node;
    if (node && !node.open) node.showModal();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (phase === "opening") {
      // Paint the transparent dialog before transitioning to its visible state.
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setPhase("open"));
      });
      return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
    }
    if (phase === "closing") {
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
      const timer = window.setTimeout(() => {
        dialog.current?.close();
        setPhase("closed");
        trigger.current?.focus({ preventScroll: true });
      }, delay);
      return () => window.clearTimeout(timer);
    }
  }, [phase]);

  const close = () => setPhase("closing");

  return <>
    <button
      ref={trigger}
      type="button"
      className={`${styles.trigger} ${className}`}
      aria-label={`${t("Enlarge photo")}: ${alt || t("Vehicle photo")}`}
      aria-haspopup="dialog"
      onClick={() => setPhase("opening")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={width} height={height} />
    </button>
    {isOpen && createPortal(
      <dialog
        ref={mountDialog}
        className={styles.overlay}
        data-visible={phase === "open"}
        aria-label={alt || t("Vehicle photo")}
        aria-modal="true"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <button type="button" className={styles.close} aria-label={t("Close photo")} onClick={close}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.enlarged} src={src} alt={alt} />
      </dialog>,
      document.body,
    )}
  </>;
}
