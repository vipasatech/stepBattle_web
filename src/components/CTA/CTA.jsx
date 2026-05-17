import styles from "./CTA.module.css";

export default function CTA({ setModal }) {
  return (
    <section className={styles.wrapper}>
      <div className={styles.blur}></div>

      <div className={styles.box}>
        <p>READY TO COMPETE?</p>

        <h2>
          Start Your
          <span> Fitness Journey</span>
          <br />
          With STEP-BATTLE.
        </h2>

        <h3>
          Join thousands of users transforming
          daily movement into competition and motivation.
        </h3>

        <div className={styles.buttons}>
          <button
            className={styles.primary}
            onClick={() => setModal(true)}
          >
            Join Waitlist
          </button>

          <button
            className={styles.secondary}
            onClick={() =>
              alert(
                "App launching soon 🚀 Currently in development."
              )
            }
          >
            Download App
          </button>
        </div>
      </div>
    </section>
  );
}