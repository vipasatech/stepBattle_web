import { Link } from "react-router-dom";
import styles from "./UpgradeResult.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.subtitle}>
          That page doesn't exist. <Link to="/">Go home</Link>.
        </p>
      </div>
    </main>
  );
}
