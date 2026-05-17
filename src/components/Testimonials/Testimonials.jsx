import styles from "./Testimonials.module.css";

const reviews = [
  {
    name: "Rahul Sharma",
    role: "Fitness Enthusiast",
    text: "STEP-BATTLE made walking genuinely addictive. Competing with friends keeps me active every single day.",
  },
  {
    name: "Priya Reddy",
    role: "College Student",
    text: "The streak system and leaderboard battles are insanely motivating. It feels like fitness meets gaming.",
  },
  {
    name: "Arjun Verma",
    role: "Runner",
    text: "Finally a fitness app that feels social and competitive instead of boring routine tracking.",
  },
];

export default function Testimonials() {
  return (
    <section id="about" className={styles.wrapper}>
      <div className={styles.top}>
        <p>COMMUNITY</p>

        <h2>
          Loved By
          <span> Competitive People.</span>
        </h2>

        <h3>
          Join a growing community turning daily
          movement into social motivation.
        </h3>
      </div>

      <div className={styles.grid}>
        {reviews.map((item, index) => (
          <div className={styles.card} key={index}>
            <div className={styles.quote}>“</div>

            <p className={styles.text}>
              {item.text}
            </p>

            <div className={styles.user}>
              <div className={styles.avatar}>
                {item.name.charAt(0)}
              </div>

              <div>
                <h4>{item.name}</h4>
                <span>{item.role}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h2>10K+</h2>
          <p>Steps Logged Daily</p>
        </div>

        <div className={styles.statCard}>
          <h2>5K+</h2>
          <p>Challenges Completed</p>
        </div>

        <div className={styles.statCard}>
          <h2>1K+</h2>
          <p>Community Members</p>
        </div>

        <div className={styles.statCard}>
          <h2>95%</h2>
          <p>User Retention</p>
        </div>
      </div>
    </section>
  );
}