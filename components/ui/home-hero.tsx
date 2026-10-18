import type { NextPage } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./home-hero.module.css";

export type HomeHeroType = {
  className?: string;
};

const HomeHero: NextPage<HomeHeroType> = ({ className = "" }) => {
  return (
    <div className={[styles.homeHero, className].join(" ")}>
      <div className={styles.heroContainer}>
        <h1 className={styles.heroTitle}>Грузия начинается<br /><span>с дороги</span></h1>
        <section className={styles.heroContent}>
          <b className={styles.eyebrow}>АРЕНДА АВТОМОБИЛЕЙ В ГРУЗИИ</b>
          <div className={styles.featureIcons}>
            <div className={styles.readingArea} />
            <Image
              className={styles.iconshieldCheck}
              width={26}
              height={26}
              sizes="100vw"
              alt=""
              src="/design/Icon-shield-check.svg"
            />
            <Image
              className={styles.iconheadphones}
              width={26}
              height={26}
              sizes="100vw"
              alt=""
              src="/design/Icon-headphones.svg"
            />
            <Image
              className={styles.iconcarFront}
              width={26}
              height={26}
              sizes="100vw"
              alt=""
              src="/design/Icon-car-front2.svg"
            />
          </div>
          <div className={styles.heroActions}>
            <h3 className={styles.lead}>
              Выберите автомобиль для города,
              <br />
              горных маршрутов и поездок к морю.
            </h3>
            <div className={styles.buttonprimaryParent}>
              <Link href="/vehicles" className={styles.buttonprimary}>
                <b className={styles.label}>Выбрать автомобиль</b>
              </Link>
              <Link href="#rental-conditions" className={styles.buttonsecondary}>
                <b className={styles.label2}>Условия аренды</b>
              </Link>
            </div>
            <div className={styles.trustContainerWrapper}>
              <div className={styles.trustContainer}>
                <div className={styles.trust}>
                  Без скрытых
                  <br />
                  платежей
                </div>
                <div className={styles.trust}>
                  Поддержка
                  <br />в поездке
                </div>
                <div className={styles.trust}>
                  Доставка
                  <br />
                  автомобиля
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className={styles.featuredVehicleWrapper}>
          <Link href="/vehicles" className={styles.featuredVehicle}>
            <div className={styles.cardContainer}>
              <div className={styles.category}>
                <b className={styles.label3}>В ПУТЬ ПО ГРУЗИИ</b>
                <Image
                  className={styles.productPhotoIcon}
                  width={636}
                  height={284}
                  sizes="100vw"
                  alt=""
                  src="/design/Product-photo@2x.png"
                />
              </div>
  
            </div>
            <div className={styles.infoContainer}>
              <div className={styles.detailsWrapper}>
                <h3 className={styles.model}>Ваш маршрут по Грузии</h3>
                <div className={styles.specs}>Город · Горы · Побережье</div>
                <div className={styles.dividerWrapper}>
                  <div className={styles.divider} />
                  <div className={styles.priceWrapper}>
                    <h3 className={styles.price}>Смотреть автопарк</h3>
                    <Image
                      className={styles.iconarrowRight}
                      width={24}
                      height={24}
                      sizes="100vw"
                      alt=""
                      src="/design/Icon-arrow-right.svg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeHero;
