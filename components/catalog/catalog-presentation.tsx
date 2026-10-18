import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import styles from "./catalog.module.css";

export function CatalogHero() {
  return (
    <header className={styles.hero} lang="ru">
      <div className={styles.heroInner}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Главная</Link><span aria-hidden="true">/</span><span>Автомобили</span>
        </nav>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>АВТОМОБИЛИ В ГРУЗИИ</p>
          <h1>Выберите автомобиль<br />для своей поездки</h1>
          <p className={styles.heroDescription}>Сравните модели, характеристики и условия аренды —<br />для города, горных маршрутов и поездок к морю.</p>
        </div>
      </div>
    </header>
  );
}

export function CatalogGuidance() {
  return (
    <div className={styles.guidance} lang="ru">
      <section className={styles.guide} id="rental-conditions" aria-labelledby="catalog-guide-title">
        <div className={styles.guideIntro}>
          <Image src="/design/Editorial-photo3@2x.png" alt="Горный маршрут в Грузии" width={888} height={912} sizes="(max-width: 600px) 100vw, 240px" className={styles.guideImage} />
          <div>
            <p className={styles.eyebrow}>ПОМОЩЬ С ВЫБОРОМ</p>
            <h2 id="catalog-guide-title">Что важно учесть<br />перед арендой</h2>
            <p>Ответы на вопросы о выборе автомобиля, маршруте и расчёте стоимости.</p>
          </div>
        </div>
        <Card className={styles.questions}>
          <details open>
            <summary>Какой автомобиль выбрать для поездки в горы?</summary>
            <p>Сравните тип привода и характеристики автомобиля. Учитывайте маршрут, сезон и количество пассажиров.</p>
          </details>
          <details>
            <summary>Как рассчитывается цена за сутки?</summary>
            <p>Стоимость зависит от автомобиля и продолжительности аренды. Укажите даты, чтобы увидеть тариф для выбранного периода.</p>
          </details>
          <details>
            <summary>Что входит в стоимость аренды?</summary>
            <p>Тариф, депозит и условия страхования указаны на странице автомобиля. Итоговый расчёт доступен перед отправкой заявки.</p>
          </details>
          <details id="how-it-works">
            <summary>Как получить подтверждение бронирования?</summary>
            <p>Выберите автомобиль, укажите даты и отправьте заявку. Статус после решения менеджера появится в личном кабинете.</p>
          </details>
        </Card>
      </section>
      <section className={styles.tripBanner} aria-labelledby="catalog-trip-title">
        <div className={styles.tripCopy}>
          <p className={styles.eyebrow}>НЕ УВЕРЕНЫ В ВЫБОРЕ?</p>
          <h2 id="catalog-trip-title">Начните с маршрута —<br />найдите свой автомобиль</h2>
          <p>Укажите даты и количество пассажиров.<br />Сравните доступные варианты для вашей поездки.</p>
          <div className={styles.tripActions}>
            <ButtonLink href="#catalog-results" className={`button-secondary ${styles.tripButton}`}>Выбрать автомобиль <span aria-hidden="true">→</span></ButtonLink>
            <Link href="/account/bookings">Мои бронирования →</Link>
          </div>
        </div>
        <div className={styles.tripImage} aria-hidden="true" />
      </section>
    </div>
  );
}
