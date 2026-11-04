import { getTranslations } from "@/lib/i18n/server";
import type { NextPage } from "next";
import { VehicleIcon, type VehicleIconName } from "./vehicle-icon";
import styles from "./component1111.module.css";

export type Component1111Type = {
  className?: string;
  number?: string;
  icon: VehicleIconName;
  label?: string;
};

const Component1111: NextPage<Component1111Type> = async ({
  className = "",
  number,
  icon,
  label,
}) => {
  const t = await getTranslations();
  return (
    <li className={[styles.rentalStep2, className].join(" ")}>
      <div className={styles.frameParent}>
        <div className={styles.numberWrapper}>
          <h2 className={styles.number}>{number}</h2>
        </div>
        <VehicleIcon
          className={styles.iconcalendarDays}
          name={icon}
          size={30}
        />
      </div>
      <div className={styles.labelWrapper}>
        <div className={styles.label}>{t(label)}</div>
      </div>
    </li>
  );
};

export default Component1111;
