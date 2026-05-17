import styles from "./AppShowcase.module.css";
import {
  Trophy,
  Flame,
  Footprints,
  TrendingUp,
} from "lucide-react";

export default function AppShowcase() {
  return (
    <section id="leaderboard" className={styles.wrapper}>
      <div className={styles.left}>
        <p>APP EXPERIENCE</p>

        <h2>
          Compete.
          <span> Climb.</span>
          <br />
          Stay Consistent.
        </h2>

        <h3>
          Designed to make fitness feel rewarding,
          social, and addictive every single day.
        </h3>

        <div className={styles.features}>
          <div className={styles.item}>
            <Trophy size={22} />
            <span>Live Leaderboards</span>
          </div>

          <div className={styles.item}>
            <Flame size={22} />
            <span>Daily Streak Tracking</span>
          </div>

          <div className={styles.item}>
            <Footprints size={22} />
            <span>Real-Time Step Count</span>
          </div>

          <div className={styles.item}>
            <TrendingUp size={22} />
            <span>Performance Analytics</span>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.blur}></div>

        <div className={styles.phoneMain}>
          <img src="/leaderboard.png" alt="main ui" />
        </div>

        <div className={styles.cardTop}>
          <span>🔥 Daily Streak</span>
          <h4>12 Days</h4>
        </div>

        <div className={styles.cardBottom}>
          <span>🏆 Rank #12</span>
          <p>Global Leaderboard</p>
        </div>
      </div>
    </section>
  );
}