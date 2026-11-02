"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "@/components/i18n/language-provider";
import styles from "./catalog.module.css";

const query = "(max-width: 900px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const mobileSnapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export function MobileFilters({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations();
  const id = useId();
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, serverSnapshot);
  const [expanded, setExpanded] = useState(false);
  return <div className={styles.filterDisclosure}>
    <button type="button" className={styles.filterToggle} aria-expanded={!mobile || expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)}>
      {t(expanded ? "Hide filters" : "Show filters")}
      <span aria-hidden="true">{expanded ? "−" : "+"}</span>
    </button>
    <div id={id} className={styles.filterContents} hidden={mobile && !expanded}>{children}</div>
  </div>;
}
