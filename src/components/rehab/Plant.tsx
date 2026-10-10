export function Plant({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32" role="img" aria-label={`Plant growth stage ${stage + 1} of 4`}>
      <ellipse cx="60" cy="112" rx="34" ry="4" className="fill-foreground/10" />
      {stage === 0 && <ellipse cx="60" cy="80" rx="7" ry="5" className="fill-soil" />}
      {stage >= 1 && <path d={`M60 82 V${stage === 1 ? 64 : stage === 2 ? 46 : 36}`} className="stroke-leaf-dark" strokeWidth="4" strokeLinecap="round" fill="none" />}
      {stage >= 1 && (
        <>
          <path d="M60 68 C48 58 40 62 42 70 C50 72 56 72 60 68Z" className="fill-leaf" />
          <path d="M60 68 C72 58 80 62 78 70 C70 72 64 72 60 68Z" className="fill-leaf" />
        </>
      )}
      {stage >= 2 && (
        <>
          <path d="M60 54 C44 42 34 48 36 58 C46 60 54 60 60 54Z" className="fill-leaf-dark" />
          <path d="M60 50 C76 38 86 44 84 54 C74 56 66 56 60 50Z" className="fill-leaf-dark" />
        </>
      )}
      {stage >= 3 && (
        <g>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="60" cy="27" rx="6" ry="10" transform={`rotate(${r} 60 36)`} className="fill-warning" />
          ))}
          <circle cx="60" cy="36" r="6" className="fill-pot" />
        </g>
      )}
      <path d="M34 82 H86 L80 110 H40 Z" className="fill-pot" />
      <rect x="30" y="78" width="60" height="9" rx="4" className="fill-pot" />
      <rect x="34" y="79" width="52" height="3" rx="1.5" className="fill-primary-foreground/40" />
    </svg>
  );
}
