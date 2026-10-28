"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

export interface Bar {
  key: string;
  label: string; // text under the bar (may be shown only on some bars)
  value: number;
  readout: string; // the sentence shown while hovering/focusing this bar
}

// A small column chart built from plain HTML (no chart library).
//  - one baseline, bars grow up from it, rounded only at the top
//  - the tallest bar ("highlight") is drawn in the accent colour
//  - hover or keyboard focus shows that bar's exact numbers in the readout line
export function BarChart({
  bars,
  highlight,
  labelEvery,
  ariaLabel,
  idleReadout,
}: {
  bars: Bar[];
  highlight: number | null;
  labelEvery: number;
  ariaLabel: string;
  idleReadout: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className={styles.chart}>
      <p className={styles.readout} aria-live="polite">
        {active === null ? idleReadout : bars[active].readout}
      </p>
      <div className={styles.plot} role="img" aria-label={ariaLabel}>
        <span className={styles.axisMax} aria-hidden>
          {max}
        </span>
        <div className={styles.columns}>
          {bars.map((bar, i) => (
            <div
              key={bar.key}
              className={styles.slot}
              tabIndex={0}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={bar.readout}
            >
              <div className={styles.barArea}>
                <div
                  className={styles.bar}
                  data-peak={i === highlight}
                  style={{ height: `${(bar.value / max) * 100}%` }}
                />
              </div>
              <span className={styles.tick} aria-hidden>
                {i % labelEvery === 0 ? bar.label : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
