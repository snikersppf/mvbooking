import type { ComponentPropsWithRef } from "react";
import styles from "./controls.module.css";

export function Button({ className = "", ...props }: ComponentPropsWithRef<"button">) {
  return <button className={`${styles.button} ${className}`} {...props} />;
}
