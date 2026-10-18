import type { NextPage } from "next";
import Image from "next/image";
import styles from "./frame-component1.module.css";

export type FrameComponent1Type = {
  className?: string;
};

const FrameComponent1: NextPage<FrameComponent1Type> = ({ className = "" }) => {
  return (
    <section className={[styles.headerParent, className].join(" ")}>
      <div className={styles.header}>
        <b className={styles.eyebrow}>СПОКОЙСТВИЕ В КАЖДОЙ ПОЕЗДКЕ</b>
        <h2 className={styles.sectionTitle}>Аренда без лишних сложностей</h2>
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
              src="/Icon-circle3.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>Прозрачная стоимость</h3>
            <div className={styles.description}>
              Уточняем состав стоимости заранее.
              <br />
              Все условия — до подтверждения бронирования.
            </div>
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
              src="/Icon-headphones.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>Помощь в поездке</h3>
            <div className={styles.description}>
              Подскажем по аренде и ответим
              <br />
              на вопросы о вашем автомобиле.
            </div>
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
              src="/Icon-circle.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>Доставка автомобиля</h3>
            <div className={styles.description}>
              Согласуем получение в аэропорту,
              <br />
              отеле или по удобному адресу.
            </div>
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
              src="/Icon-circle2.svg"
            />
          </div>
          <div className={styles.benefitContent}>
            <h3 className={styles.title}>Подготовленные автомобили</h3>
            <div className={styles.description}>
              Обсудим оснащение и состояние
              <br />
              автомобиля перед поездкой.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent1;
