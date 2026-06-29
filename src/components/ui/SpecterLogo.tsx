export default function SpecterLogo({ 
  size = 'md', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string; 
}) {
  const dimensions = {
    sm: 14,
    md: 20,
    lg: 28,
  }[size];

  return (
    <svg
      width={dimensions}
      height={dimensions}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer tactical diamond */}
      <path
        d="M2 12L12 2L22 12L12 22L2 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner crosshair */}
      <path
        d="M12 7V17M7 12H17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ opacity: 0.4 }}
      />
      {/* Core node */}
      <circle 
        cx="12" 
        cy="12" 
        r="2" 
        fill="var(--accent)" 
        style={{ filter: 'drop-shadow(0 0 4px var(--accent-glow))' }}
      />
    </svg>
  );
}