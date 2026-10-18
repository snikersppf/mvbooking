import { getTranslations } from "@/lib/i18n/server";
import Link from "next/link";
import styles from "./frame-component1111.module.css";

export default async function RentalQuestions() {
  const t = await getTranslations();
  return (
    <section className={styles.faqLayout} id="rental-conditions" aria-labelledby="faq-title">
      <div className={styles.header}>
        <b className={styles.eyebrow}>{t("ВАЖНО ЗНАТЬ")}</b>
        <h2 id="faq-title" className={styles.faqHeading}>{t("Ответы перед поездкой")}</h2>
        <p className={styles.faqIntroduction}>{t("Собрали ответы на популярные вопросы об аренде автомобиля.")}</p>
        <Link className={styles.telegramSupport} href="/vehicles">{t("Выбрать автомобиль →")}</Link>
      </div>
      <div className={styles.questions}>
        <details className={styles.questionCard} open>
          <summary>{t("Какие документы нужны для аренды?")}</summary>
          <p>{t("Подготовьте паспорт и водительское удостоверение. Остальные требования уточним перед бронированием.")}</p>
        </details>
        <details className={styles.questionCard}>
          <summary>{t("Как рассчитывается стоимость аренды?")}</summary>
          <p>{t("Выберите автомобиль и даты поездки. Расчёт стоимости и депозит отображаются перед отправкой заявки.")}</p>
        </details>
        <details className={styles.questionCard}>
          <summary>{t("Нужно ли оставлять депозит?")}</summary>
          <p>{t("Размер депозита указан в карточке выбранного автомобиля и в расчёте стоимости.")}</p>
        </details>
        <details className={styles.questionCard}>
          <summary>{t("Можно ли получить автомобиль в аэропорту?")}</summary>
          <p>{t("Укажите место получения при оформлении заявки. Детали согласовываются до подтверждения бронирования.")}</p>
        </details>
      </div>
    </section>
  );
}
