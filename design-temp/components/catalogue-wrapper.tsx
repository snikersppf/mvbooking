import type { NextPage } from "next";
import Image from "next/image";
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
            <b className={styles.catalogueLink}>Смотреть все автомобили →</b>
          </div>
        </div>
        <div className={styles.sectionDescription}>
          От города до горных дорог — подберите автомобиль для путешествия по
          Грузии.
        </div>
      </section>
      <div className={styles.vehicleCard}>
        <section className={styles.carCardsubaruCrosstrek2025}>
          <div className={styles.vehicleContainer}>
            <div className={styles.vehicleGrid}>
              <Image
                className={styles.studioSurfaceIcon}
                width={408}
                height={174}
                sizes="100vw"
                alt=""
                src="/Studio-surface@2x.png"
              />
              <div className={styles.category}>
                <b className={styles.label}>AWD CROSSOVER</b>
              </div>
              <div className={styles.vehicleContent}>
                <Image
                  className={styles.iconheart}
                  width={20}
                  height={20}
                  sizes="100vw"
                  alt=""
                  src="/Icon-heart.svg"
                />
              </div>
            </div>
          </div>
          <div className={styles.vehicleDetails}>
            <h3 className={styles.vehicleName}>Subaru Crosstrek 2025</h3>
            <div className={styles.priceContainerParent}>
              <div className={styles.priceContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-users.svg"
                  />
                </div>
                <div className={styles.spec}>5 мест</div>
              </div>
              <div className={styles.actionContainerParent}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-cog.svg"
                  />
                </div>
                <div className={styles.spec}>Автомат</div>
              </div>
              <div className={styles.driveSpecContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-mountain-snow.svg"
                  />
                </div>
                <div className={styles.spec}>Полный привод</div>
              </div>
            </div>
          </div>
          <div className={styles.priceDetails}>
            <div className={styles.priceDetailsContainer}>
              <div className={styles.priceDetailsWrapper}>
                <div className={styles.priceDetailsInner}>
                  <div className={styles.pricePrefix}>от</div>
                </div>
                <h2 className={styles.price}>$95</h2>
                <div className={styles.perDayWrapper}>
                  <div className={styles.pricePrefix}>/ сутки</div>
                </div>
              </div>
              <button className={styles.actionButtonContainer}>
                <div className={styles.actionButtonWrapper}>
                  <div className={styles.button}>
                    <b className={styles.label2}>Подробнее</b>
                  </div>
                  <Image
                    className={styles.openVehicleIcon}
                    width={36}
                    height={40}
                    sizes="100vw"
                    alt=""
                    src="/Open-vehicle.svg"
                  />
                </div>
              </button>
            </div>
          </div>
        </section>
        <section className={styles.carCardsubaruCrosstrek2025}>
          <div className={styles.vehicleContainer}>
            <div className={styles.vehicleGrid}>
              <Image
                className={styles.studioSurfaceIcon}
                width={408}
                height={174}
                sizes="100vw"
                alt=""
                src="/Studio-surface@2x.png"
              />
              <div className={styles.category}>
                <b className={styles.label}>AWD CROSSOVER</b>
              </div>
              <div className={styles.vehicleContent}>
                <Image
                  className={styles.iconheart}
                  width={20}
                  height={20}
                  sizes="100vw"
                  alt=""
                  src="/Icon-heart.svg"
                />
              </div>
            </div>
          </div>
          <div className={styles.vehicleDetails}>
            <h3 className={styles.vehicleName}>Subaru Crosstrek 2025</h3>
            <div className={styles.priceContainerParent}>
              <div className={styles.priceContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-users.svg"
                  />
                </div>
                <div className={styles.spec}>5 мест</div>
              </div>
              <div className={styles.actionContainerParent}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-cog.svg"
                  />
                </div>
                <div className={styles.spec}>Автомат</div>
              </div>
              <div className={styles.driveSpecContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-mountain-snow.svg"
                  />
                </div>
                <div className={styles.spec}>Полный привод</div>
              </div>
            </div>
          </div>
          <div className={styles.priceDetails}>
            <div className={styles.priceDetailsContainer}>
              <div className={styles.priceDetailsWrapper}>
                <div className={styles.priceDetailsInner}>
                  <div className={styles.pricePrefix}>от</div>
                </div>
                <h2 className={styles.price}>$95</h2>
                <div className={styles.perDayWrapper}>
                  <div className={styles.pricePrefix}>/ сутки</div>
                </div>
              </div>
              <button className={styles.actionButtonContainer}>
                <div className={styles.actionButtonWrapper}>
                  <div className={styles.button}>
                    <b className={styles.label2}>Подробнее</b>
                  </div>
                  <Image
                    className={styles.openVehicleIcon}
                    width={36}
                    height={40}
                    sizes="100vw"
                    alt=""
                    src="/Open-vehicle.svg"
                  />
                </div>
              </button>
            </div>
          </div>
        </section>
        <section className={styles.carCardsubaruCrosstrek2025}>
          <div className={styles.vehicleContainer}>
            <div className={styles.vehicleGrid}>
              <Image
                className={styles.studioSurfaceIcon}
                width={408}
                height={174}
                sizes="100vw"
                alt=""
                src="/Studio-surface@2x.png"
              />
              <div className={styles.category}>
                <b className={styles.label}>AWD CROSSOVER</b>
              </div>
              <div className={styles.vehicleContent}>
                <Image
                  className={styles.iconheart}
                  width={20}
                  height={20}
                  sizes="100vw"
                  alt=""
                  src="/Icon-heart.svg"
                />
              </div>
            </div>
          </div>
          <div className={styles.vehicleDetails}>
            <h3 className={styles.vehicleName}>Subaru Crosstrek 2025</h3>
            <div className={styles.priceContainerParent}>
              <div className={styles.priceContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-users.svg"
                  />
                </div>
                <div className={styles.spec}>5 мест</div>
              </div>
              <div className={styles.actionContainerParent}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-cog.svg"
                  />
                </div>
                <div className={styles.spec}>Автомат</div>
              </div>
              <div className={styles.driveSpecContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-mountain-snow.svg"
                  />
                </div>
                <div className={styles.spec}>Полный привод</div>
              </div>
            </div>
          </div>
          <div className={styles.priceDetails}>
            <div className={styles.priceDetailsContainer}>
              <div className={styles.priceDetailsWrapper}>
                <div className={styles.priceDetailsInner}>
                  <div className={styles.pricePrefix}>от</div>
                </div>
                <h2 className={styles.price}>$95</h2>
                <div className={styles.perDayWrapper}>
                  <div className={styles.pricePrefix}>/ сутки</div>
                </div>
              </div>
              <button className={styles.actionButtonContainer}>
                <div className={styles.actionButtonWrapper}>
                  <div className={styles.button}>
                    <b className={styles.label2}>Подробнее</b>
                  </div>
                  <Image
                    className={styles.openVehicleIcon}
                    width={36}
                    height={40}
                    sizes="100vw"
                    alt=""
                    src="/Open-vehicle.svg"
                  />
                </div>
              </button>
            </div>
          </div>
        </section>
        <section className={styles.carCardsubaruCrosstrek20254}>
          <div className={styles.carCardsubaruCrosstrek2025Inner4}>
            <div className={styles.vehicleGrid}>
              <Image
                className={styles.studioSurfaceIcon}
                width={408}
                height={174}
                sizes="100vw"
                alt=""
                src="/Studio-surface@2x.png"
              />
              <div className={styles.category}>
                <b className={styles.label}>AWD CROSSOVER</b>
              </div>
              <div className={styles.vehicleContent}>
                <Image
                  className={styles.iconheart}
                  width={20}
                  height={20}
                  sizes="100vw"
                  alt=""
                  src="/Icon-heart.svg"
                />
              </div>
            </div>
          </div>
          <div className={styles.frameParent10}>
            <div className={styles.vehicleNameContainer}>
              <h3 className={styles.vehicleName}>Subaru Crosstrek 2025</h3>
              <div className={styles.priceContainerParent}>
                <div className={styles.priceContainer}>
                  <div className={styles.priceWrapper}>
                    <Image
                      className={styles.iconusers}
                      width={17}
                      height={17}
                      sizes="100vw"
                      alt=""
                      src="/Icon-users.svg"
                    />
                  </div>
                  <div className={styles.spec}>5 мест</div>
                </div>
                <div className={styles.actionContainerParent}>
                  <div className={styles.priceWrapper}>
                    <Image
                      className={styles.iconusers}
                      width={17}
                      height={17}
                      sizes="100vw"
                      alt=""
                      src="/Icon-cog.svg"
                    />
                  </div>
                  <div className={styles.spec}>Автомат</div>
                </div>
                <div className={styles.driveSpecContainer}>
                  <div className={styles.priceWrapper}>
                    <Image
                      className={styles.iconusers}
                      width={17}
                      height={17}
                      sizes="100vw"
                      alt=""
                      src="/Icon-mountain-snow.svg"
                    />
                  </div>
                  <div className={styles.spec}>Полный привод</div>
                </div>
              </div>
            </div>
            <div className={styles.frameParent11}>
              <div className={styles.priceDetailsWrapper}>
                <div className={styles.priceDetailsInner}>
                  <div className={styles.pricePrefix}>от</div>
                </div>
                <h2 className={styles.price}>$95</h2>
                <div className={styles.perDayWrapper}>
                  <div className={styles.pricePrefix}>/ сутки</div>
                </div>
              </div>
              <button className={styles.actionButtonContainer}>
                <div className={styles.actionButtonWrapper}>
                  <div className={styles.button}>
                    <b className={styles.label2}>Подробнее</b>
                  </div>
                  <Image
                    className={styles.openVehicleIcon}
                    width={36}
                    height={40}
                    sizes="100vw"
                    alt=""
                    src="/Open-vehicle.svg"
                  />
                </div>
              </button>
            </div>
          </div>
        </section>
        <section className={styles.carCardsubaruCrosstrek2025}>
          <div className={styles.vehicleContainer}>
            <div className={styles.vehicleGrid}>
              <Image
                className={styles.studioSurfaceIcon}
                width={408}
                height={174}
                sizes="100vw"
                alt=""
                src="/Studio-surface@2x.png"
              />
              <div className={styles.category}>
                <b className={styles.label}>AWD CROSSOVER</b>
              </div>
              <div className={styles.vehicleContent}>
                <Image
                  className={styles.iconheart}
                  width={20}
                  height={20}
                  sizes="100vw"
                  alt=""
                  src="/Icon-heart.svg"
                />
              </div>
            </div>
          </div>
          <div className={styles.vehicleDetails}>
            <h3 className={styles.vehicleName}>Subaru Crosstrek 2025</h3>
            <div className={styles.priceContainerParent}>
              <div className={styles.priceContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-users.svg"
                  />
                </div>
                <div className={styles.spec}>5 мест</div>
              </div>
              <div className={styles.actionContainerParent}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-cog.svg"
                  />
                </div>
                <div className={styles.spec}>Автомат</div>
              </div>
              <div className={styles.driveSpecContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-mountain-snow.svg"
                  />
                </div>
                <div className={styles.spec}>Полный привод</div>
              </div>
            </div>
          </div>
          <div className={styles.priceDetails}>
            <div className={styles.priceDetailsContainer}>
              <div className={styles.priceDetailsWrapper}>
                <div className={styles.priceDetailsInner}>
                  <div className={styles.pricePrefix}>от</div>
                </div>
                <h2 className={styles.price}>$95</h2>
                <div className={styles.perDayWrapper}>
                  <div className={styles.pricePrefix}>/ сутки</div>
                </div>
              </div>
              <button className={styles.actionButtonContainer}>
                <div className={styles.actionButtonWrapper}>
                  <div className={styles.button}>
                    <b className={styles.label2}>Подробнее</b>
                  </div>
                  <Image
                    className={styles.openVehicleIcon}
                    width={36}
                    height={40}
                    sizes="100vw"
                    alt=""
                    src="/Open-vehicle.svg"
                  />
                </div>
              </button>
            </div>
          </div>
        </section>
        <section className={styles.carCardsubaruCrosstrek2025}>
          <div className={styles.vehicleContainer}>
            <div className={styles.vehicleGrid}>
              <Image
                className={styles.studioSurfaceIcon}
                width={408}
                height={174}
                sizes="100vw"
                alt=""
                src="/Studio-surface@2x.png"
              />
              <div className={styles.category}>
                <b className={styles.label}>AWD CROSSOVER</b>
              </div>
              <div className={styles.vehicleContent}>
                <Image
                  className={styles.iconheart}
                  width={20}
                  height={20}
                  sizes="100vw"
                  alt=""
                  src="/Icon-heart.svg"
                />
              </div>
            </div>
          </div>
          <div className={styles.vehicleDetails}>
            <h3 className={styles.vehicleName}>Subaru Crosstrek 2025</h3>
            <div className={styles.priceContainerParent}>
              <div className={styles.priceContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-users.svg"
                  />
                </div>
                <div className={styles.spec}>5 мест</div>
              </div>
              <div className={styles.actionContainerParent}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-cog.svg"
                  />
                </div>
                <div className={styles.spec}>Автомат</div>
              </div>
              <div className={styles.driveSpecContainer}>
                <div className={styles.priceWrapper}>
                  <Image
                    className={styles.iconusers}
                    width={17}
                    height={17}
                    sizes="100vw"
                    alt=""
                    src="/Icon-mountain-snow.svg"
                  />
                </div>
                <div className={styles.spec}>Полный привод</div>
              </div>
            </div>
          </div>
          <div className={styles.priceDetails}>
            <div className={styles.priceDetailsContainer}>
              <div className={styles.priceDetailsWrapper}>
                <div className={styles.priceDetailsInner}>
                  <div className={styles.pricePrefix}>от</div>
                </div>
                <h2 className={styles.price}>$95</h2>
                <div className={styles.perDayWrapper}>
                  <div className={styles.pricePrefix}>/ сутки</div>
                </div>
              </div>
              <button className={styles.actionButtonContainer}>
                <div className={styles.actionButtonWrapper}>
                  <div className={styles.button}>
                    <b className={styles.label2}>Подробнее</b>
                  </div>
                  <Image
                    className={styles.openVehicleIcon}
                    width={36}
                    height={40}
                    sizes="100vw"
                    alt=""
                    src="/Open-vehicle.svg"
                  />
                </div>
              </button>
            </div>
          </div>
        </section>
      </div>
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
        <section className={styles.route}>
          <Image
            className={styles.editorialPhotoIcon}
            width={444}
            height={456}
            sizes="100vw"
            alt=""
            src="/Editorial-photo3@2x.png"
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
              src="/Open-route.svg"
            />
          </div>
        </section>
        <section className={styles.routeGrid}>
          <div className={styles.routeItem}>
            <div className={styles.route2}>
              <Image
                className={styles.editorialPhotoIcon}
                width={398}
                height={218}
                sizes="100vw"
                alt=""
                src="/Editorial-photo2@2x.png"
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
                  src="/Open-route.svg"
                />
              </div>
            </div>
            <div className={styles.route2}>
              <Image
                className={styles.editorialPhotoIcon}
                width={398}
                height={218}
                sizes="100vw"
                alt=""
                src="/Editorial-photo@2x.png"
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
                    src="/Open-route.svg"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.route4}>
            <Image
              className={styles.editorialPhotoIcon}
              width={816}
              height={218}
              sizes="100vw"
              alt=""
              src="/Editorial-photo1@2x.png"
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
                src="/Open-route.svg"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CatalogueWrapper;
