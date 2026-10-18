import type { NextPage } from "next";
import Image from "next/image";
import styles from "./final-c-t-a.module.css";

export type FinalCTAType = {
  className?: string;
};

const FinalCTA: NextPage<FinalCTAType> = ({ className = "" }) => {
  return (
    <section className={[styles.finalCta, className].join(" ")}>
      <div className={styles.illustrationtopographicPatte}>
        <div className={styles.container}>
          <Image
            className={styles.groupIcon}
            width={657.7}
            height={244.9}
            sizes="100vw"
            alt=""
            src="/Group.svg"
          />
          <b className={styles.eyebrow}>ПОМОЖЕМ С ВЫБОРОМ</b>
          <h1 className={styles.title}>
            Не нашли подходящий
            <br />
            автомобиль?
          </h1>
          <div className={styles.body}>
            Оставьте контакты и расскажите о поездке.
            <br />
            Подберём подходящий автомобиль.
          </div>
        </div>
        <div className={styles.container2}>
          <div className={styles.container3}>
            <Image
              className={styles.iconphone}
              width={20}
              height={20}
              sizes="100vw"
              alt=""
              src="/Icon-phone.svg"
            />
            <div className={styles.phone}>+995 000 00 00</div>
          </div>
          <div className={styles.container3}>
            <Image
              className={styles.iconbrandTelegram}
              width={21}
              height={21}
              sizes="100vw"
              alt=""
              src="/Icon-brand-telegram.svg"
            />
            <div className={styles.telegram}>Написать в Telegram</div>
          </div>
        </div>
      </div>
      <Image
        className={styles.vehicleOnGraphicBackground}
        loading="lazy"
        width={350}
        height={197}
        sizes="100vw"
        alt=""
        src="/Product-photo@2x.png"
      />
      <div className={styles.container5}>
        <form className={styles.enquiryForm}>
          <div className={styles.container6}>
            <div className={styles.field}>
              <input
                className={styles.placeholder}
                placeholder="Ваше имя"
                type="text"
              />
            </div>
            <div className={styles.field}>
              <input
                className={styles.placeholder}
                placeholder="Телефон или Telegram"
                type="text"
              />
            </div>
            <div className={styles.field2}>
              <input
                className={styles.placeholder3}
                placeholder="Даты поездки"
                type="text"
              />
              <div className={styles.container7}>
                <Image
                  className={styles.iconcalendarDays}
                  width={18}
                  height={18}
                  sizes="100vw"
                  alt=""
                  src="/Icon-calendar-days1.svg"
                />
              </div>
            </div>
            <div className={styles.field}>
              <input
                className={styles.placeholder}
                placeholder="Комментарий"
                type="text"
              />
            </div>
          </div>
          <button className={styles.button} type="submit">
            <b className={styles.label}>Получить подборку →</b>
          </button>
        </form>
      </div>
    </section>
  );
};

export default FinalCTA;
