import { useEffect, useState } from "react";
import "./OverkillSplash.css";

interface Props {
  show: boolean;
  statText?: string;
  onDismiss: () => void;
}

export function OverkillSplash({ show, statText, onDismiss }: Props) {
  const [phase, setPhase] = useState<"entering" | "visible" | "exiting" | "hidden">("hidden");

  useEffect(() => {
    if (show) {
      setPhase("entering");
      const t1 = setTimeout(() => setPhase("visible"), 120);
      const t2 = setTimeout(() => setPhase("exiting"), 2600);
      const t3 = setTimeout(() => { setPhase("hidden"); onDismiss(); }, 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [show, onDismiss]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`ok-overlay ${phase === "exiting" ? "exiting" : "entering"}`}
      onClick={onDismiss}
    >
      <div className="ok-content">
        <div className="ok-title">OVERKILLED!</div>
        {statText && <div className="ok-stat">{statText}</div>}
        <div className="ok-sub">TAP TO DISMISS</div>
      </div>
    </div>
  );
}
