import Image from "next/image";
import Link from "next/link";
import styles from "./footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <Link href="/" aria-label="MVBooking"><Image src="/design/MASTER-VADYA-PNG-logo@2x.png" alt="MVBooking" width={444} height={69} /></Link>
          <p className={styles.brandCopy}>Аренда автомобилей для путешествий по Грузии без лишних сложностей.</p>
        </div>
        <nav aria-label="Навигация">
          <b>Навигация</b>
          <Link href="/vehicles">Автомобили</Link>
          <Link href="#rental-conditions">Условия аренды</Link>
          <Link href="#how-it-works">Как это работает</Link>
        </nav>
        <nav aria-label="Личный кабинет">
          <b>Личный кабинет</b>
          <Link href="/account/bookings">Мои бронирования</Link>
          <Link href="/login">Войти</Link>
          <Link href="/register">Создать аккаунт</Link>
        </nav>
      </div>
      <div className={styles.footerLegal}>MVBooking · Аренда автомобилей в Грузии</div>
    </footer>
  );
}
