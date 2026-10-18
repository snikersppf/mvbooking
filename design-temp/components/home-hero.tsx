import type { NextPage } from "next";
import Image from "next/image";
import styles from "./home-hero.module.css";

export type HomeHeroType = {
  className?: string;
};

const HomeHero: NextPage<HomeHeroType> = ({ className = "" }) => {
  return (
    <div className={[styles.homeHero, className].join(" ")}>
      <div className={styles.heroContainer}>
        <Image
          className={styles.unifiedPhotoCarRoadM}
          width={1440}
          height={600}
          sizes="100vw"
          alt=""
          src="/Unified-photo-car-road-mountains@2x.png"
        />
        <h2 className={styles.h1}>Грузия начинается</h2>
        <h1 className={styles.h1Accent}>с дороги</h1>
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
              src="/Icon-shield-check.svg"
            />
            <Image
              className={styles.iconheadphones}
              width={26}
              height={26}
              sizes="100vw"
              alt=""
              src="/Icon-headphones.svg"
            />
            <Image
              className={styles.iconcarFront}
              width={26}
              height={26}
              sizes="100vw"
              alt=""
              src="/Icon-car-front2.svg"
            />
          </div>
          <div className={styles.heroActions}>
            <h3 className={styles.lead}>
              Выберите автомобиль для города,
              <br />
              горных маршрутов и поездок к морю.
            </h3>
            <div className={styles.buttonprimaryParent}>
              <button className={styles.buttonprimary}>
                <b className={styles.label}>Выбрать автомобиль</b>
              </button>
              <button className={styles.buttonsecondary}>
                <b className={styles.label2}>Условия аренды</b>
              </button>
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
          <div className={styles.featuredVehicle}>
            <div className={styles.cardContainer}>
              <div className={styles.category}>
                <b className={styles.label3}>AWD CROSSOVER</b>
                <Image
                  className={styles.productPhotoIcon}
                  width={318}
                  height={142}
                  sizes="100vw"
                  alt=""
                  src="/Product-photo@2x.png"
                />
              </div>
              <div className={styles.actionWrapper}>
                <Image
                  className={styles.iconheart}
                  width={22}
                  height={22}
                  sizes="100vw"
                  alt=""
                  src="/Icon-heart.svg"
                />
              </div>
            </div>
            <div className={styles.infoContainer}>
              <div className={styles.detailsWrapper}>
                <h3 className={styles.model}>Subaru Crosstrek 2025</h3>
                <div className={styles.specs}>5 мест · Автомат · AWD</div>
                <div className={styles.dividerWrapper}>
                  <div className={styles.divider} />
                  <div className={styles.priceWrapper}>
                    <h3 className={styles.price}>от $95 / сутки</h3>
                    <Image
                      className={styles.iconarrowRight}
                      width={24}
                      height={24}
                      sizes="100vw"
                      alt=""
                      src="/Icon-arrow-right.svg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeHero;
