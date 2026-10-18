import type { ComponentPropsWithRef } from "react";
import styles from "./badge.module.css";

export function Badge({ className = "", ...props }: ComponentPropsWithRef<"span">) {
  return <span className={`${styles.badge} ${className}`} {...props} />;
}
