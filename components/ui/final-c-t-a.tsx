import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import { Input } from "./input";
import { Button } from "./button";
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
            src="/design/Group.svg"
          />
          <b className={styles.eyebrow}>ПОМОЖЕМ С ВЫБОРОМ</b>
          <h2 className={styles.title}>
            Не нашли подходящий
            <br />
            автомобиль?
          </h2>
          <div className={styles.body}>
            Начните с выбора автомобиля в каталоге.
            <br />
            Сравните варианты для вашего путешествия.
          </div>
        </div>
        {/* TODO: check connection. Add verified contact links when they are provided. */}
        <Link href="/vehicles" className={styles.catalogueAction}>Перейти в каталог →</Link>
      </div>
      <Image
        className={styles.vehicleOnGraphicBackground}
        loading="lazy"
        width={636}
        height={284}
        sizes="100vw"
        alt=""
        src="/design/Product-photo@2x.png"
      />
      <div className={styles.container5}>
        {/* TODO: check connection. No enquiry endpoint exists; enable only after connecting the approved form handler. */}
        <div className={styles.enquiryForm}>
          <p className={styles.formNotice}>Подбор по запросу пока недоступен. <Link href="/vehicles">Выберите автомобиль в каталоге.</Link></p>
          <fieldset disabled aria-label="Подбор автомобиля — пока недоступен" className={styles.disabledFields}>
          <div className={styles.container6}>
            <div className={styles.field}>
              <Input
                className={styles.placeholder}
                aria-label="Ваше имя" placeholder="Ваше имя"
                type="text"
              />
            </div>
            <div className={styles.field}>
              <Input
                className={styles.placeholder}
                aria-label="Телефон или Telegram" placeholder="Телефон или Telegram"
                type="text"
              />
            </div>
            <div className={styles.field2}>
              <Input
                className={styles.placeholder3}
                aria-label="Даты поездки" placeholder="Даты поездки"
                type="text"
              />
              <div className={styles.container7}>
                <Image
                  className={styles.iconcalendarDays}
                  width={18}
                  height={18}
                  sizes="100vw"
                  alt=""
                  src="/design/Icon-calendar-days1.svg"
                />
              </div>
            </div>
            <div className={styles.field}>
              <Input
                className={styles.placeholder}
                aria-label="Комментарий" placeholder="Комментарий"
                type="text"
              />
            </div>
          </div>
          <Button className={styles.button} type="button" disabled>
            <b className={styles.label}>Получить подборку →</b>
          </Button>
        </fieldset>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
