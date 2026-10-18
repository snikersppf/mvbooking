import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./controls.module.css";

export function ButtonLink({ className = "", ...props }: ComponentProps<typeof Link>) {
  return <Link className={`${styles.button} ${className}`} {...props} />;
}
