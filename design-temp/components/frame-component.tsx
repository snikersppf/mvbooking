import type { NextPage } from "next";
import Image from "next/image";
import styles from "./frame-component.module.css";

export type FrameComponentType = {
  className?: string;
};

const FrameComponent: NextPage<FrameComponentType> = ({ className = "" }) => {
  return (
    <section className={[styles.rentalSearchBarWrapper, className].join(" ")}>
      <div className={styles.rentalSearchBar}>
        <div className={styles.pickupContainerWrapper}>
          <div className={styles.pickupContainer}>
            <div className={styles.pickupWrapper}>
              <Image
                className={styles.iconmapPin}
                width={24}
                height={24}
                sizes="100vw"
                alt=""
                src="/Icon-map-pin.svg"
              />
            </div>
            <div className={styles.pickupContent}>
              <div className={styles.label}>Получение</div>
              <div className={styles.value}>Выберите место</div>
            </div>
          </div>
        </div>
        <div className={styles.searchRow}>
          <div className={styles.searchCol}>
            <div className={styles.searchItem}>
              <Image
                className={styles.iconchevronDown}
                width={14}
                height={14}
                sizes="100vw"
                alt=""
                src="/Icon-chevron-down.svg"
              />
            </div>
            <div className={styles.dividerCol}>
              <div className={styles.divider} />
            </div>
            <div className={styles.locationCol}>
              <Image
                className={styles.iconmapPin}
                width={24}
                height={24}
                sizes="100vw"
                alt=""
                src="/Icon-map-pin.svg"
              />
            </div>
            <div className={styles.locationContent}>
              <div className={styles.locationWrapper}>
                <div className={styles.label}>Возврат</div>
                <div className={styles.value2}>То же место</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.searchRow2}>
          <div className={styles.frameParent}>
            <div className={styles.searchItem}>
              <Image
                className={styles.iconchevronDown}
                width={14}
                height={14}
                sizes="100vw"
                alt=""
                src="/Icon-chevron-down.svg"
              />
            </div>
            <div className={styles.dividerWrapper}>
              <div className={styles.divider} />
            </div>
            <div className={styles.locationCol}>
              <Image
                className={styles.iconmapPin}
                width={24}
                height={24}
                sizes="100vw"
                alt=""
                src="/Icon-calendar-days2.svg"
              />
            </div>
            <div className={styles.frameWrapper}>
              <div className={styles.locationWrapper}>
                <div className={styles.label}>Период аренды</div>
                <div className={styles.value3}>Выберите даты</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.categoryContainerWrapper}>
          <div className={styles.frameParent}>
            <div className={styles.categoryWrapper}>
              <div className={styles.categoryContent}>
                <Image
                  className={styles.iconchevronDown}
                  width={14}
                  height={14}
                  sizes="100vw"
                  alt=""
                  src="/Icon-chevron-down.svg"
                />
              </div>
              <div className={styles.divider3} />
              <div className={styles.categoryDetails}>
                <Image
                  className={styles.iconmapPin}
                  width={24}
                  height={24}
                  sizes="100vw"
                  alt=""
                  src="/Icon-car-front1.svg"
                />
              </div>
            </div>
            <div className={styles.categoryInfo}>
              <div className={styles.locationWrapper}>
                <div className={styles.label}>Категория</div>
                <div className={styles.value4}>Все автомобили</div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.submitWrapperParent}>
          <div className={styles.submitWrapper}>
            <Image
              className={styles.iconchevronDown}
              width={14}
              height={14}
              sizes="100vw"
              alt=""
              src="/Icon-chevron-down.svg"
            />
          </div>
          <button className={styles.buttonprimary}>
            <div className={styles.submitContent}>
              <b className={styles.label5}>Найти автомобиль</b>
            </div>
            <Image
              className={styles.iconarrowRight}
              width={24}
              height={24}
              sizes="100vw"
              alt=""
              src="/Icon-arrow-right1.svg"
            />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent;
