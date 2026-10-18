import type { NextPage } from "next";
import Image from "next/image";
import Component1111 from "./component1111";
import styles from "./frame-component11.module.css";

export type FrameComponent11Type = {
  className?: string;
};

const FrameComponent11: NextPage<FrameComponent11Type> = ({
  className = "",
}) => {
  return (
    <section className={[styles.containerParent, className].join(" ")}>
      <div className={styles.container}>
        <b className={styles.eyebrow}>ВСЁ ПРОСТО</b>
        <h2 className={styles.sectionTitle}>
          От выбора автомобиля до начала путешествия
        </h2>
      </div>
      <div className={styles.list}>
        <div className={styles.rentalStep1}>
          <div className={styles.divider}>
            <h2 className={styles.number}>01</h2>
          </div>
          <div className={styles.content}>
            <div className={styles.iconcarFrontWrapper}>
              <Image
                className={styles.iconcarFront}
                width={38}
                height={38}
                sizes="100vw"
                alt=""
                src="/Icon-car-front.svg"
              />
            </div>
            <div className={styles.label}>
              Выберите
              <br />
              автомобиль
            </div>
          </div>
        </div>
        <div className={styles.item}>
          <div className={styles.divider2} />
        </div>
        <Component1111
          number="02"
          iconcalendarDays="/Icon-calendar-days.svg"
          label={`Укажите
маршрут и даты`}
        />
        <div className={styles.item}>
          <div className={styles.divider3} />
        </div>
        <Component1111
          number="03"
          iconcalendarDays="/Icon-file-text.svg"
          label={`Оставьте
контакты`}
        />
        <div className={styles.item}>
          <div className={styles.divider4} />
        </div>
        <Component1111
          number="04"
          iconcalendarDays="/Icon-circle-check-big.svg"
          label={`Получите
подтверждение`}
        />
        <div className={styles.item}>
          <div className={styles.divider5} />
        </div>
        <Component1111
          number="05"
          iconcalendarDays="/Icon-send.svg"
          label={`Отправляйтесь
в путь`}
        />
      </div>
    </section>
  );
};

export default FrameComponent11;
