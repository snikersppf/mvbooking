import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./catalogue-wrapper.module.css";

export type CatalogueWrapperType = {
  className?: string;
};

const CatalogueWrapper: NextPage<CatalogueWrapperType> = ({
  className = "",
}) => {
  return (
    <div className={[styles.catalogueWrapper, className].join(" ")}>
      <b className={styles.eyebrow}>НАШ АВТОПАРК</b>
      <section className={styles.catalogueHeader}>
        <div className={styles.catalogueTitleWrapper}>
          <h2 className={styles.sectionTitle}>
            Автомобили для любого маршрута
          </h2>
          <div className={styles.catalogueLinkWrapper}>
            <Link href="/vehicles" className={styles.catalogueLink}>Смотреть все автомобили →</Link>
          </div>
        </div>
        <div className={styles.sectionDescription}>
          От города до горных дорог — подберите автомобиль для путешествия по
          Грузии.
        </div>
      </section>
      <Link className={styles.catalogueBanner} href="/vehicles">
        <Image src="/design/Studio-surface@2x.png" alt="Автомобиль для путешествия по Грузии" width={816} height={348} sizes="(max-width: 600px) 100vw, 408px" />
        <span><strong>Выберите автомобиль и даты поездки</strong><span>Доступные автомобили, характеристики и актуальная стоимость — в каталоге.</span><b>Открыть каталог →</b></span>
      </Link>
      <section className={styles.eyebrowParent}>
        <b className={styles.eyebrow}>ПОДБЕРИТЕ ПОД СВОЮ ПОЕЗДКУ</b>
        <div className={styles.sectionTitleParent}>
          <h2 className={styles.sectionTitle2}>Куда вы отправитесь сегодня?</h2>
          <div className={styles.sectionDescription2}>
            Город, горы, семья или море — у нас есть автомобиль для каждого
            маршрута.
          </div>
        </div>
      </section>
      <div className={styles.routeParent}>
        <Link href="/vehicles" className={styles.route}>
          <Image
            className={styles.editorialPhotoIcon}
            fill
            sizes="100vw"
            alt=""
            src="/design/Editorial-photo3@2x.png"
          />
          <div className={styles.routeContent}>
            <div className={styles.bottomContrast} />
            <div className={styles.routeHeader}>
              <div className={styles.routeInfo}>
                <h2 className={styles.title}>
                  Для горных
                  <br />
                  маршрутов
                </h2>
                <div className={styles.description}>
                  Полный привод и новые впечатления
                </div>
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
                sizes="100vw"
                alt=""
                src="/design/Editorial-photo2@2x.png"
              />
              <div className={styles.routeCardContent}>
                <div className={styles.bottomContrast2} />
                <div className={styles.routeCardHeader}>
                  <div className={styles.routeCardInfo}>
                    <h3 className={styles.title}>Для города</h3>
                    <div className={styles.description}>
                      Комфорт в городском ритме
                    </div>
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
                sizes="100vw"
                alt=""
                src="/design/Editorial-photo@2x.png"
              />
              <div className={styles.routeSubAction}>
                <div className={styles.bottomContrast2} />
                <h3 className={styles.title3}>Для семьи</h3>
                <div className={styles.routeActionContent}>
                  <div className={styles.routeActionInfo}>
                    <div className={styles.description3}>
                      Простор для больших планов
                    </div>
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
              sizes="100vw"
              alt=""
              src="/design/Editorial-photo1@2x.png"
            />
            <div className={styles.bottomContrastParent}>
              <div className={styles.bottomContrast4} />
              <div className={styles.routeSubContentWrapper}>
                <div className={styles.routeSubContent}>
                  <h3 className={styles.title}>Для поездок к морю</h3>
                  <div className={styles.description}>
                    Свобода открывать новые места
                  </div>
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
