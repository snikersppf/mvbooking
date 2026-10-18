import { getTranslations } from "@/lib/i18n/server";
import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./catalogue-wrapper.module.css";

export type CatalogueWrapperType = {
  className?: string;
};

const CatalogueWrapper: NextPage<CatalogueWrapperType> = async ({
  className = "",
}) => {
  const t = await getTranslations();
  return (
    <div className={[styles.catalogueWrapper, className].join(" ")}>
      <b className={styles.eyebrow}>{t("НАШ АВТОПАРК")}</b>
      <section className={styles.catalogueHeader}>
        <div className={styles.catalogueTitleWrapper}>
          <h2 className={styles.sectionTitle}>
            {t("Автомобили для любого маршрута")}</h2>
          <div className={styles.catalogueLinkWrapper}>
            <Link href="/vehicles" className={styles.catalogueLink}>{t("Смотреть все автомобили →")}</Link>
          </div>
        </div>
        <div className={styles.sectionDescription}>
          {t("От города до горных дорог — подберите автомобиль для путешествия по Грузии.")}</div>
      </section>
      <Link className={styles.catalogueBanner} href="/vehicles">
        <Image src="/design/Studio-surface@2x.png" alt={t(t("Автомобиль для путешествия по Грузии"))} width={816} height={348} sizes="(max-width: 600px) 100vw, 408px" />
        <span><strong>{t("Выберите автомобиль и даты поездки")}</strong><span>{t("Доступные автомобили, характеристики и актуальная стоимость — в каталоге.")}</span><b>{t("Открыть каталог →")}</b></span>
      </Link>
      <section className={styles.eyebrowParent}>
        <b className={styles.eyebrow}>{t("ПОДБЕРИТЕ ПОД СВОЮ ПОЕЗДКУ")}</b>
        <div className={styles.sectionTitleParent}>
          <h2 className={styles.sectionTitle2}>{t("Куда вы отправитесь сегодня?")}</h2>
          <div className={styles.sectionDescription2}>
            {t("Город, горы, семья или море — у нас есть автомобиль для каждого маршрута.")}</div>
        </div>
      </section>
      <div className={styles.routeParent}>
        <Link href="/vehicles" className={styles.route}>
          <Image
            className={styles.editorialPhotoIcon}
            fill
            sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 800px) calc(100vw - 80px), (max-width: 1153px) calc(100vw - 160px), (max-width: 1239px) calc(100vw - 710px), (max-width: 1300px) calc(50vw - 90px), 444px"
            alt=""
            src="/design/Editorial-photo3@2x.png"
          />
          <div className={styles.routeContent}>
            <div className={styles.bottomContrast} />
            <div className={styles.routeHeader}>
              <div className={styles.routeInfo}>
                <h2 className={styles.title}>
                  {t("Для горных")}<br />
                  {t("маршрутов")}</h2>
                <div className={styles.description}>
                  {t("Полный привод и новые впечатления")}</div>
              </div>
            </div>
            <Image
              className={styles.openRouteIcon}
              width={37}
              height={37}
              sizes="100vw"
              alt=""
              src="/design/Open-route.svg"
            />
          </div>
        </Link>
        <section className={styles.routeGrid}>
          <div className={styles.routeItem}>
            <Link href="/vehicles" className={styles.route2}>
              <Image
                className={styles.editorialPhotoIcon}
                fill
                sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 800px) calc(50vw - 50px), (max-width: 1153px) calc(50vw - 90px), (max-width: 1239px) 259px, (max-width: 1300px) calc(25vw - 55px), (max-width: 1440px) calc(50vw - 322px), 398px"
                alt=""
                src="/design/Editorial-photo2@2x.png"
              />
              <div className={styles.routeCardContent}>
                <div className={styles.bottomContrast2} />
                <div className={styles.routeCardHeader}>
                  <div className={styles.routeCardInfo}>
                    <h3 className={styles.title}>{t("Для города")}</h3>
                    <div className={styles.description}>
                      {t("Комфорт в городском ритме")}</div>
                  </div>
                </div>
                <Image
                  className={styles.openRouteIcon}
                  width={37}
                  height={37}
                  sizes="100vw"
                  alt=""
                  src="/design/Open-route.svg"
                />
              </div>
            </Link>
            <Link href="/vehicles" className={styles.route2}>
              <Image
                className={styles.editorialPhotoIcon}
                fill
                sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 800px) calc(50vw - 50px), (max-width: 1153px) calc(50vw - 90px), (max-width: 1239px) 259px, (max-width: 1300px) calc(25vw - 55px), (max-width: 1440px) calc(50vw - 322px), 398px"
                alt=""
                src="/design/Editorial-photo@2x.png"
              />
              <div className={styles.routeSubAction}>
                <div className={styles.bottomContrast2} />
                <h3 className={styles.title3}>{t("Для семьи")}</h3>
                <div className={styles.routeActionContent}>
                  <div className={styles.routeActionInfo}>
                    <div className={styles.description3}>
                      {t("Простор для больших планов")}</div>
                  </div>
                  <Image
                    className={styles.openRouteIcon3}
                    width={37}
                    height={37}
                    sizes="100vw"
                    alt=""
                    src="/design/Open-route.svg"
                  />
                </div>
              </div>
            </Link>
          </div>
          <Link href="/vehicles" className={styles.route4}>
            <Image
              className={styles.editorialPhotoIcon}
              fill
              sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 800px) calc(100vw - 80px), (max-width: 1153px) calc(100vw - 160px), (max-width: 1239px) 530px, (max-width: 1300px) calc(50vw - 90px), (max-width: 1440px) calc(100vw - 624px), 816px"
              alt=""
              src="/design/Editorial-photo1@2x.png"
            />
            <div className={styles.bottomContrastParent}>
              <div className={styles.bottomContrast4} />
              <div className={styles.routeSubContentWrapper}>
                <div className={styles.routeSubContent}>
                  <h3 className={styles.title}>{t("Для поездок к морю")}</h3>
                  <div className={styles.description}>
                    {t("Свобода открывать новые места")}</div>
                </div>
              </div>
              <Image
                className={styles.openRouteIcon}
                width={37}
                height={37}
                sizes="100vw"
                alt=""
                src="/design/Open-route.svg"
              />
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
};

export default CatalogueWrapper;
