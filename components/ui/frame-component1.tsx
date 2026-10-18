import { getTranslations } from "@/lib/i18n/server";
import type { NextPage } from "next";
import Image from "next/image";
import styles from "./frame-component1.module.css";

export type FrameComponent1Type = {
  className?: string;
};

const FrameComponent1: NextPage<FrameComponent1Type> = async ({ className = "" }) => {
  const t = await getTranslations();
  return (
    <section className={[styles.headerParent, className].join(" ")}>
      <div className={styles.header}>
        <b className={styles.eyebrow}>{t("СПОКОЙСТВИЕ В КАЖДОЙ ПОЕЗДКЕ")}</b>
        <h2 className={styles.sectionTitle}>{t("Аренда без лишних сложностей")}</h2>
      </div>
      <div className={styles.benefitGrid}>
        <div className={styles.benefit}>
          <div className={styles.benefitContainer}>
            <Image
              className={styles.iconCircle}
              width={72}
              height={72}
              sizes="100vw"
              alt=""
              src="/design/Icon-circle3.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>{t("Прозрачная стоимость")}</h3>
            <div className={styles.description}>
              {t("Уточняем состав стоимости заранее.")}<br />
              {t("Все условия — до подтверждения бронирования.")}</div>
          </div>
        </div>
        <div className={styles.benefit}>
          <div className={styles.benefitContainer}>
            <Image
              className={styles.iconCircle}
              width={72}
              height={72}
              sizes="100vw"
              alt=""
              src="/design/Icon-headphones.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>{t("Помощь в поездке")}</h3>
            <div className={styles.description}>
              {t("Подскажем по аренде и ответим")}<br />
              {t("на вопросы о вашем автомобиле.")}</div>
          </div>
        </div>
      </div>
      <div className={styles.benefitGrid}>
        <div className={styles.benefit}>
          <div className={styles.benefitContainer}>
            <Image
              className={styles.iconCircle}
              width={72}
              height={72}
              sizes="100vw"
              alt=""
              src="/design/Icon-circle.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>{t("Доставка автомобиля")}</h3>
            <div className={styles.description}>
              {t("Согласуем получение в аэропорту,")}<br />
              {t("отеле или по удобному адресу.")}</div>
          </div>
        </div>
        <div className={styles.benefit}>
          <div className={styles.benefitContainer}>
            <Image
              className={styles.iconCircle}
              width={72}
              height={72}
              sizes="100vw"
              alt=""
              src="/design/Icon-circle2.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>{t("Подготовленные автомобили")}</h3>
            <div className={styles.description}>
              {t("Обсудим оснащение и состояние")}<br />
              {t("автомобиля перед поездкой.")}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent1;
