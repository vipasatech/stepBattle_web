import styles from "./Hero.module.css";
import { motion } from "framer-motion";

export default function Hero({ setModal }) {
  return (
    <section className={styles.hero}>
      <div className={styles.blur1}></div>
      <div className={styles.blur2}></div>

      <div className={styles.left}>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.tag}
        >
          WALK • COMPETE • WIN
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Every Step
          <span> Counts.</span>
          <br />
          Every Battle
          <span> Matters.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={styles.description}
        >
          Turn your daily walking into competitive battles.
          Challenge friends, climb leaderboards, and stay
          consistent with gamified fitness.
        </motion.p>

        <div className={styles.buttons}>
          <button
            className={styles.primary}
            onClick={() => setModal(true)}
          >
            Join Waitlist
          </button>

          <a href="#features">
            <button className={styles.secondary}>
              Explore Features
            </button>
          </a>
        </div>

        <div className={styles.stats}>
          <div className={styles.card}>
            <h2>12K+</h2>
            <p>Daily Steps</p>
          </div>

          <div className={styles.card}>
            <h2>5K+</h2>
            <p>Battles Played</p>
          </div>

          <div className={styles.card}>
            <h2>1K+</h2>
            <p>Active Users</p>
          </div>
        </div>
      </div>

      <motion.div
        className={styles.right}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className={styles.phone}>
          <img
            src="/hero-preview.png"
            alt="STEP-BATTLE app preview"
          />
        </div>
      </motion.div>
    </section>
  );
}