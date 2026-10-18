import type { NextPage } from "next";
import Image from "next/image";
import styles from "./frame-component1111.module.css";

export type FrameComponent1111Type = {
  className?: string;
};

const FrameComponent1111: NextPage<FrameComponent1111Type> = ({
  className = "",
}) => {
  return (
    <section className={[styles.containerParent, className].join(" ")}>
      <div className={styles.container}>
        <div className={styles.header}>
          <b className={styles.eyebrow}>ВАЖНО ЗНАТЬ</b>
          <div className={styles.container2}>
            <h2 className={styles.faqHeading}>Ответы перед поездкой</h2>
            <div className={styles.faqIntroduction}>
              Собрали ответы на популярные вопросы.
              <br />
              Если не нашли нужную информацию —<br />
              напишите нам в Telegram.
            </div>
          </div>
        </div>
        <div className={styles.list}>
          <div className={styles.faqopen}>
            <div className={styles.container3}>
              <b className={styles.question}>
                Какие документы нужны для аренды?
              </b>
              <div className={styles.iconplusWrapper}>
                <Image
                  className={styles.iconminus}
                  width={18}
                  height={18}
                  sizes="100vw"
                  alt=""
                  src="/Icon-minus.svg"
                />
              </div>
            </div>
            <div className={styles.answer}>
              Подготовьте паспорт и водительское удостоверение.
              <br />
              Остальные требования уточним перед бронированием.
            </div>
          </div>
          <div className={styles.faq}>
            <div className={styles.question2}>
              Как рассчитывается стоимость аренды?
            </div>
            <div className={styles.iconplusWrapper}>
              <Image
                className={styles.iconplus}
                width={22}
                height={22}
                sizes="100vw"
                alt=""
                src="/Icon-plus.svg"
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.container6}>
        <div className={styles.wrapper}>
          <div className={styles.telegramSupport}>
            <div className={styles.container7}>
              <Image
                className={styles.iconbrandTelegram}
                loading="lazy"
                width={50}
                height={50}
                sizes="100vw"
                alt=""
                src="/Icon-brand-telegram.svg"
              />
            </div>
            <div className={styles.container8}>
              <b className={styles.title}>Нужна помощь?</b>
              <div className={styles.action}>Напишите нам в Telegram →</div>
            </div>
          </div>
          <div className={styles.accordion}>
            <div className={styles.faq}>
              <div className={styles.question3}>
                Нужно ли оставлять депозит?
              </div>
              <div className={styles.iconplusWrapper}>
                <Image
                  className={styles.iconplus}
                  width={22}
                  height={22}
                  sizes="100vw"
                  alt=""
                  src="/Icon-plus.svg"
                />
              </div>
            </div>
            <div className={styles.faq}>
              <div className={styles.question4}>
                Можно ли получить автомобиль в аэропорту?
              </div>
              <div className={styles.iconplusWrapper}>
                <Image
                  className={styles.iconplus}
                  width={22}
                  height={22}
                  sizes="100vw"
                  alt=""
                  src="/Icon-plus.svg"
                />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.container10}>
          <b className={styles.allQuestions}>Все вопросы и ответы →</b>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent1111;
