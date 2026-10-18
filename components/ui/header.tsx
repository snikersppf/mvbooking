import type { ReactNode } from "react";
import styles from "./header.module.css";

export default function Header({ children }: Readonly<{ children: ReactNode }>) {
  return <header className={`${styles.header} site-header`}>{children}</header>;
}
