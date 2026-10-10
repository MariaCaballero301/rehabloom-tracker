// Glossy, bubbly Frutiger Aero plant. Pure SVG with four fixed stages.
export function Plant({ stage, size = "md" }: { stage: number; size?: "md" | "lg" }) {
  const stem = stage === 1 ? 64 : stage === 2 ? 46 : 36;
  return (
    <svg viewBox="0 0 120 120" className={size === "lg" ? "h-48 w-48 sm:h-56 sm:w-56" : "h-32 w-32"} role="img" aria-label={`Plant growth stage ${stage + 1} of 4`}>
      <defs>
        <radialGradient id="pl-bubble" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="var(--primary-foreground)" stopOpacity="0.9" />
          <stop offset="60%" stopColor="var(--primary)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id="pl-leaf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--leaf)" />
          <stop offset="100%" stopColor="var(--leaf-dark)" />
        </linearGradient>
        <linearGradient id="pl-pot" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--pot)" stopOpacity="0.8" />
          <stop offset="55%" stopColor="var(--pot)" />
          <stop offset="100%" stopColor="var(--pot)" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="pl-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary-foreground)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="var(--primary-foreground)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill="url(#pl-bubble)" stroke="var(--primary-foreground)" strokeOpacity="0.7" />
      <ellipse cx="44" cy="22" rx="20" ry="8" fill="url(#pl-shine)" transform="rotate(-25 44 22)" />
      <ellipse cx="60" cy="110" rx="30" ry="3.5" className="fill-foreground/10" />
      {stage === 0 && <ellipse cx="60" cy="80" rx="7" ry="5" className="fill-soil" />}
      {stage >= 1 && <path d={`M60 82 V${stem}`} stroke="var(--leaf-dark)" strokeWidth="4.5" strokeLinecap="round" fill="none" />}
      {stage >= 1 && (
        <g>
          <ellipse cx="49" cy="68" rx="11" ry="6.5" transform="rotate(20 49 68)" fill="url(#pl-leaf)" />
          <ellipse cx="71" cy="68" rx="11" ry="6.5" transform="rotate(-20 71 68)" fill="url(#pl-leaf)" />
          <ellipse cx="47" cy="66" rx="5" ry="2" transform="rotate(20 47 66)" fill="var(--primary-foreground)" opacity="0.6" />
          <ellipse cx="69" cy="66" rx="5" ry="2" transform="rotate(-20 69 66)" fill="var(--primary-foreground)" opacity="0.6" />
        </g>
      )}
      {stage >= 2 && (
        <g>
          <ellipse cx="46" cy="52" rx="14" ry="8" transform="rotate(25 46 52)" fill="url(#pl-leaf)" />
          <ellipse cx="74" cy="49" rx="14" ry="8" transform="rotate(-25 74 49)" fill="url(#pl-leaf)" />
          <ellipse cx="43" cy="49" rx="6" ry="2.4" transform="rotate(25 43 49)" fill="var(--primary-foreground)" opacity="0.6" />
          <ellipse cx="71" cy="46" rx="6" ry="2.4" transform="rotate(-25 71 46)" fill="var(--primary-foreground)" opacity="0.6" />
        </g>
      )}
      {stage >= 3 && (
        <g>
          {[0, 72, 144, 216, 288].map((r) => (
            <circle key={r} cx="60" cy="25" r="7" transform={`rotate(${r} 60 34)`} className="fill-warning" />
          ))}
          <circle cx="60" cy="34" r="6.5" className="fill-pot" />
          <circle cx="58" cy="32" r="2.2" fill="var(--primary-foreground)" opacity="0.8" />
        </g>
      )}
      <path d="M36 84 H84 L79 106 Q78 109 75 109 H45 Q42 109 41 106 Z" fill="url(#pl-pot)" />
      <rect x="31" y="78" width="58" height="10" rx="5" fill="url(#pl-pot)" />
      <rect x="35" y="79.5" width="50" height="3.5" rx="1.75" fill="url(#pl-shine)" />
      <ellipse cx="48" cy="95" rx="3" ry="8" fill="var(--primary-foreground)" opacity="0.35" />
    </svg>
  );
}
