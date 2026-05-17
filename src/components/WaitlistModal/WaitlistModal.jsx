import styles from "./WaitlistModal.module.css";
import { X } from "lucide-react";
import { useState } from "react";

export default function WaitlistModal({
  open,
  setOpen,
}) {
  const [email, setEmail] = useState("");

  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (!email.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }

    setJoined(true);

    setEmail("");

    setTimeout(() => {
      setOpen(false);
      setJoined(false);
    }, 2000);
  };

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button
          className={styles.close}
          onClick={() => setOpen(false)}
        >
          <X size={24} />
        </button>

        {!joined ? (
          <>
            <p>STEP-BATTLE</p>

            <h2>Join The Waitlist</h2>

            <h3>
              Be among the first users to experience
              competitive fitness.
            </h3>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <button
              className={styles.join}
              onClick={handleJoin}
            >
              Join Now
            </button>
          </>
        ) : (
          <div className={styles.success}>
            <div className={styles.check}>
              ✓
            </div>

            <h2>You're In 🚀</h2>

            <p>
              Thanks for joining the STEP-BATTLE
              waitlist.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}