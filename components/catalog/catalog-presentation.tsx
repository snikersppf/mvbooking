import { getTranslations } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import styles from "./catalog.module.css";

export async function CatalogHero() {
  const t = await getTranslations();
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <nav className={styles.breadcrumb} aria-label={t("Breadcrumb")}>
          <Link href="/">{t("Главная")}</Link><span aria-hidden="true">/</span><span>{t("Автомобили")}</span>
        </nav>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t("АВТОМОБИЛИ В ГРУЗИИ")}</p>
          <h1>{t("Выберите автомобиль")}<br />{t("для своей поездки")}</h1>
          <p className={styles.heroDescription}>{t("Сравните модели, характеристики и условия аренды —")}<br />{t("для города, горных маршрутов и поездок к морю.")}</p>
        </div>
      </div>
    </header>
  );
}

export async function CatalogGuidance() {
  const t = await getTranslations();
  return (
    <div className={styles.guidance}>
      <section className={styles.guide} id="rental-conditions" aria-labelledby="catalog-guide-title">
        <div className={styles.guideIntro}>
          <Image src="/design/Editorial-photo3@2x.png" alt={t(t("Горный маршрут в Грузии"))} width={888} height={912} sizes="(max-width: 600px) 100vw, 240px" className={styles.guideImage} />
          <div>
            <p className={styles.eyebrow}>{t("ПОМОЩЬ С ВЫБОРОМ")}</p>
            <h2 id="catalog-guide-title">{t("Что важно учесть")}<br />{t("перед арендой")}</h2>
            <p>{t("Ответы на вопросы о выборе автомобиля, маршруте и расчёте стоимости.")}</p>
          </div>
        </div>
        <Card className={styles.questions}>
          <details open>
            <summary>{t("Какой автомобиль выбрать для поездки в горы?")}</summary>
            <p>{t("Сравните тип привода и характеристики автомобиля. Учитывайте маршрут, сезон и количество пассажиров.")}</p>
          </details>
          <details>
            <summary>{t("Как рассчитывается цена за сутки?")}</summary>
            <p>{t("Стоимость зависит от автомобиля и продолжительности аренды. Укажите даты, чтобы увидеть тариф для выбранного периода.")}</p>
          </details>
          <details>
            <summary>{t("Что входит в стоимость аренды?")}</summary>
            <p>{t("Тариф, депозит и условия страхования указаны на странице автомобиля. Итоговый расчёт доступен перед отправкой заявки.")}</p>
          </details>
          <details id="how-it-works">
            <summary>{t("Как получить подтверждение бронирования?")}</summary>
            <p>{t("Выберите автомобиль, укажите даты и отправьте заявку. Статус после решения менеджера появится в личном кабинете.")}</p>
          </details>
        </Card>
      </section>
      <section className={styles.tripBanner} aria-labelledby="catalog-trip-title">
        <div className={styles.tripCopy}>
          <p className={styles.eyebrow}>{t("НЕ УВЕРЕНЫ В ВЫБОРЕ?")}</p>
          <h2 id="catalog-trip-title">{t("Начните с маршрута —")}<br />{t("найдите свой автомобиль")}</h2>
          <p>{t("Укажите даты и количество пассажиров.")}<br />{t("Сравните доступные варианты для вашей поездки.")}</p>
          <div className={styles.tripActions}>
            <ButtonLink href="#catalog-results" className={`button-secondary ${styles.tripButton}`}>{t("Выбрать автомобиль ")}<span aria-hidden="true">→</span></ButtonLink>
            <Link href="/account/bookings">{t("Мои бронирования →")}</Link>
          </div>
        </div>
        <div className={styles.tripImage} aria-hidden="true" />
      </section>
    </div>
  );
}
