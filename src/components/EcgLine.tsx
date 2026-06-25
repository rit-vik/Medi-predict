export function EcgLine({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 120"
      className={className}
      fill="none"
      preserveAspectRatio="none"
    >
      <path
        d="M0,60 L120,60 L140,60 L160,30 L180,90 L200,40 L220,60 L380,60 L400,30 L420,90 L440,20 L460,100 L480,60 L640,60 L660,40 L680,80 L700,60 L800,60"
        stroke="var(--cyan)"
        strokeWidth="2"
        className="ecg-line"
      />
    </svg>
  );
}