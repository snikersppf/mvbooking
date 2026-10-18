import type { HTMLAttributes } from "react";
import styles from "./card.module.css";

type CardProps = HTMLAttributes<HTMLElement> & { as?: "section" | "article" | "div" };

export function Card({ as: Tag = "section", className = "", ...props }: CardProps) {
  return <Tag className={`${styles.card} ${className}`} {...props} />;
}
