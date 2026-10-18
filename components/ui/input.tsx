import type { ComponentPropsWithRef } from "react";
import styles from "./controls.module.css";

// React 19 forwards ref as a prop; preserve every React Hook Form registration prop.
export function Input({ className = "", ...props }: ComponentPropsWithRef<"input">) {
  return <input className={`${styles.input} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentPropsWithRef<"select">) {
  return <select className={`${styles.input} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentPropsWithRef<"textarea">) {
  return <textarea className={`${styles.input} ${className}`} {...props} />;
}
