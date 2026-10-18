import type { ComponentPropsWithoutRef } from "react";
import styles from "./page-shell.module.css";

export function PageShell({ className = "", ...props }: ComponentPropsWithoutRef<"main">) {
  return <main className={`${styles.shell} ${className}`} {...props} />;
}
