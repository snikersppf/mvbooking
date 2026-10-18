import { getTranslations } from "@/lib/i18n/server";
import type { NextPage } from "next";
import Image from "next/image";
import styles from "./component1111.module.css";

export type Component1111Type = {
  className?: string;
  number?: string;
  iconcalendarDays: string;
  label?: string;
};

const Component1111: NextPage<Component1111Type> = async ({
  className = "",
  number,
  iconcalendarDays,
  label,
}) => {
  const t = await getTranslations();
  return (
    <div className={[styles.rentalStep2, className].join(" ")}>
      <div className={styles.frameParent}>
        <div className={styles.numberWrapper}>
          <h2 className={styles.number}>{number}</h2>
        </div>
        <Image
          className={styles.iconcalendarDays}
          width={38}
          height={38}
          sizes="100vw"
          alt=""
          src={iconcalendarDays}
        />
      </div>
      <div className={styles.labelWrapper}>
        <div className={styles.label}>{t(label)}</div>
      </div>
    </div>
  );
};

export default Component1111;
