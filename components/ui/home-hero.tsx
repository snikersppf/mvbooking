import { getTranslations } from "@/lib/i18n/server";
import Image from "next/image";
import Link from "next/link";
import styles from "./home-hero.module.css";

export default async function HomeHero() {
  const t = await getTranslations();
  const benefits = [
    ["Icon-shield-check.svg", "Без скрытых", "платежей"],
    ["Icon-headphones.svg", "Поддержка", "в поездке"],
    ["Icon-car-front2.svg", "Доставка", "автомобиля"],
  ];
  return <section className={styles.homeHero} aria-labelledby="home-hero-title">
    <div className={styles.heroContainer}>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>{t("АРЕНДА АВТОМОБИЛЕЙ В ГРУЗИИ")}</p>
        <h1 id="home-hero-title" className={styles.heroTitle}>{t("Грузия начинается")}<br /><span>{t("с дороги")}</span></h1>
        <p className={styles.lead}>{t("Выберите автомобиль для города,")}<br />{t("горных маршрутов и поездок к морю.")}</p>
        <div className={styles.heroActions}>
          <Link href="/vehicles" className={styles.primary}>{t("Выбрать автомобиль")}</Link>
          <Link href="#rental-conditions" className={styles.secondary}>{t("Условия аренды")}</Link>
        </div>
        <ul className={styles.benefits}>{benefits.map(([icon, first, second]) => <li key={icon}>
          <Image src={`/design/${icon}`} width={24} height={24} alt="" />
          <span>{t(first)}<br />{t(second)}</span>
        </li>)}</ul>
      </div>
      <Link href="/vehicles" className={styles.featuredVehicle}>
        <span className={styles.badge}>{t("В ПУТЬ ПО ГРУЗИИ")}</span>
        <Image className={styles.productPhoto} src="/design/Product-photo@2x.png" width={636} height={284} sizes="310px" alt="" />
        <h2>{t("Ваш маршрут по Грузии")}</h2>
        <p>{t("Город · Горы · Побережье")}</p>
        <div className={styles.cardAction}>{t("Смотреть автопарк")}<span aria-hidden="true">→</span></div>
      </Link>
    </div>
  </section>;
}
