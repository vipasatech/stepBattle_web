import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="logo" />
          <h2>STEP-BATTLE</h2>
        </div>

        <p>
          Transforming fitness into social competition
          and daily motivation.
        </p>
      </div>

      <div className={styles.right}>
        <a href="#">Instagram</a>
        <a href="#">Twitter</a>
        <a href="#">LinkedIn</a>
        <a href="#">Contact</a>
      </div>
    </footer>
  );
}