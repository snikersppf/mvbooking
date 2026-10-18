import type { NextPage } from "next";
import Image from "next/image";
import styles from "./footer.module.css";

export type FooterType = {
  className?: string;
};

const Footer: NextPage<FooterType> = ({ className = "" }) => {
  return (
    <section className={[styles.footer, className].join(" ")}>
      <div className={styles.divider} />
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.container2}>
            <Image
              className={styles.masterVadyaPngLogo}
              width={258.3}
              height={39.7}
              sizes="100vw"
              alt=""
              src="/MASTER-VADYA-PNG-logo@2x.png"
            />
          </div>
          <div className={styles.column}>
            <b className={styles.footerTitle1}>Навигация</b>
          </div>
          <div className={styles.column2}>
            <b className={styles.footerTitle2}>Информация</b>
          </div>
          <div className={styles.column}>
            <b className={styles.footerTitle1}>Связаться</b>
          </div>
        </div>
        <div className={styles.container3}>
          <div className={styles.container4}>
            <div className={styles.brandCopy}>
              Аренда автомобилей для путешествий
              <br />
              по Грузии без лишних сложностей.
            </div>
          </div>
          <div className={styles.footerLinks1}>
            Автомобили
            <br />
            Условия аренды
            <br />
            Как это работает
          </div>
          <div className={styles.footerLinks2Wrapper}>
            <div className={styles.footerLinks2}>
              FAQ
              <br />
              Контакты
              <br />
              Политика конфиденциальности
            </div>
          </div>
          <div className={styles.contactInfo}>
            <div className={styles.contactDetails}>
              <div className={styles.contactWrapper}>
                <div className={styles.contactIcons}>
                  <Image
                    className={styles.iconphone}
                    width={18}
                    height={18}
                    sizes="100vw"
                    alt=""
                    src="/Icon-phone.svg"
                  />
                  <Image
                    className={styles.iconbrandTelegram}
                    width={18}
                    height={18}
                    sizes="100vw"
                    alt=""
                    src="/Icon-brand-telegram.svg"
                  />
                </div>
              </div>
              <div className={styles.footerPhoneParent}>
                <div className={styles.footerPhone}>+995 000 00 00</div>
                <div className={styles.footerTelegram}>Написать в Telegram</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.dividerParent}>
        <div className={styles.divider} />
        <div className={styles.legalContainer}>
          <div className={styles.copyright}>
            © 2026 MASTER VADYA. Все права защищены.
          </div>
          <div className={styles.legal}>Политика конфиденциальности</div>
        </div>
      </div>
    </section>
  );
};

export default Footer;
