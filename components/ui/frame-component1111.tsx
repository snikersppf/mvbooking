import Link from "next/link";
import styles from "./frame-component1111.module.css";

export default function RentalQuestions() {
  return (
    <section className={styles.faqLayout} id="rental-conditions" aria-labelledby="faq-title">
      <div className={styles.header}>
        <b className={styles.eyebrow}>ВАЖНО ЗНАТЬ</b>
        <h2 id="faq-title" className={styles.faqHeading}>Ответы перед поездкой</h2>
        <p className={styles.faqIntroduction}>Собрали ответы на популярные вопросы об аренде автомобиля.</p>
        <Link className={styles.telegramSupport} href="/vehicles">Выбрать автомобиль →</Link>
      </div>
      <div className={styles.questions}>
        <details className={styles.questionCard} open>
          <summary>Какие документы нужны для аренды?</summary>
          <p>Подготовьте паспорт и водительское удостоверение. Остальные требования уточним перед бронированием.</p>
        </details>
        <details className={styles.questionCard}>
          <summary>Как рассчитывается стоимость аренды?</summary>
          <p>Выберите автомобиль и даты поездки. Расчёт стоимости и депозит отображаются перед отправкой заявки.</p>
        </details>
        <details className={styles.questionCard}>
          <summary>Нужно ли оставлять депозит?</summary>
          <p>Размер депозита указан в карточке выбранного автомобиля и в расчёте стоимости.</p>
        </details>
        <details className={styles.questionCard}>
          <summary>Можно ли получить автомобиль в аэропорту?</summary>
          <p>Укажите место получения при оформлении заявки. Детали согласовываются до подтверждения бронирования.</p>
        </details>
      </div>
    </section>
  );
}
