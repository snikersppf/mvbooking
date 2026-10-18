import type { NextPage } from "next";
import Image from "next/image";
import styles from "./header.module.css";

export type HeaderType = {
  className?: string;
};

const Header: NextPage<HeaderType> = ({ className = "" }) => {
  return (
    <header className={[styles.header, className].join(" ")}>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.content}>
            <Image
              className={styles.masterVadyaPngLogo}
              loading="lazy"
              width={221.8}
              height={34.1}
              sizes="100vw"
              alt=""
              src="/MASTER-VADYA-PNG-logo@2x.png"
            />
          </div>
          <div className={styles.navigation}>
            <div className={styles.navMenu}>
              <div className={styles.nav}>Автомобили</div>
              <div className={styles.navItem}>
                <div className={styles.nav2}>Условия аренды</div>
              </div>
              <div className={styles.navItem2}>
                <div className={styles.nav3}>Как это работает</div>
              </div>
              <div className={styles.nav4}>Контакты</div>
            </div>
          </div>
          <div className={styles.actions}>
            <div className={styles.contactContainer}>
              <Image
                className={styles.iconphone}
                width={21}
                height={21}
                sizes="100vw"
                alt=""
                src="/Icon-phone.svg"
              />
              <b className={styles.phone}>+995 000 00 00</b>
            </div>
            <button className={styles.buttonsecondary}>
              <b className={styles.label}>Забронировать</b>
            </button>
          </div>
        </div>
      </div>
      <div className={styles.divider} />
    </header>
  );
};

export default Header;
