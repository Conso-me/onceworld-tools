import { useEffect, useState, useMemo } from "react";
import "./OverkillSplash.css";

interface Props {
  show: boolean;
  statLabel?: string;
  statValue?: number;
  onDismiss: () => void;
}

type Phase = "hidden" | "entering" | "active" | "exiting";

interface Particle {
  id: number;
  tx: string; ty: string; tr: string;
  size: string;
  color: string;
  radius: string;
  dur: string;
  delay: string;
}

function generateParticles(count: number): Particle[] {
  const colors = ["#f97316","#fb923c","#fbbf24","#fde047","#ffffff","#fed7aa","#ef4444"];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + Math.random() * (360 / count);
    const dist  = 120 + Math.random() * 220;
    const rad   = (angle * Math.PI) / 180;
    const isSquare = Math.random() > 0.6;
    return {
      id: i,
      tx: `${Math.cos(rad) * dist}px`,
      ty: `${Math.sin(rad) * dist}px`,
      tr: `${(Math.random() - 0.5) * 900}deg`,
      size: `${4 + Math.random() * 10}px`,
      color: colors[Math.floor(Math.random() * colors.length)],
      radius: isSquare ? "2px" : "50%",
      dur: `${0.6 + Math.random() * 0.6}s`,
      delay: `${Math.random() * 0.15}s`,
    };
  });
}

export function OverkillSplash({ show, statLabel = "ATK", statValue = 0, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [displayValue, setDisplayValue] = useState(0);
  const particles = useMemo(() => generateParticles(36), []);

  useEffect(() => {
    if (!show) return;

    setDisplayValue(0);
    setPhase("entering");

    const t1 = setTimeout(() => setPhase("active"), 120);

    // number roll: ease-out cubic over 900ms
    const target = statValue;
    const steps = 35;
    const dur = 900;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      const p = step / steps;
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayValue(Math.round(target * eased));
      if (step >= steps) { clearInterval(iv); setDisplayValue(target); }
    }, dur / steps);

    const t2 = setTimeout(() => setPhase("exiting"), 3200);
    const t3 = setTimeout(() => { setPhase("hidden"); onDismiss(); }, 3750);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearInterval(iv);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`ok-overlay ok-${phase}`}
      onClick={onDismiss}
    >
      {/* layers */}
      <div className="ok-bg" />
      <div className="ok-glow" />
      <div className="ok-scanlines" />
      <div className="ok-flash" />

      {/* particles */}
      <div className="ok-particles">
        {particles.map(p => (
          <span
            key={p.id}
            className="ok-particle"
            style={{
              "--tx": p.tx, "--ty": p.ty, "--tr": p.tr,
              "--size": p.size, "--color": p.color,
              "--radius": p.radius, "--dur": p.dur, "--delay": p.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* content */}
      <div className="ok-shake">
        <div className="ok-badge">★ &nbsp; PERFECT KILL &nbsp; ★</div>
        <div className="ok-title">OVERKILLED!</div>
        <div className="ok-bar" />
        <div className="ok-stat-wrap">
          <span className="ok-stat-label">{statLabel}</span>
          <span className="ok-stat-value">{displayValue.toLocaleString()}</span>
        </div>
        <div className="ok-tap">► &nbsp; TAP TO DISMISS &nbsp; ◄</div>
      </div>
    </div>
  );
}
