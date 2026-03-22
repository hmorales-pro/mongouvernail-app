/**
 * MonGouvernail compass logo as inline SVG component.
 * Props: size (number, default 24), className (string)
 */
export default function Logo({ size = 24, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <radialGradient id="logoBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0a0a14" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#logoBg)" />
      <circle cx="256" cy="256" r="175" fill="none" stroke="#2E86F0" strokeWidth="18" opacity="0.9" />
      {/* Ring gaps */}
      <rect x="230" y="68" width="52" height="24" fill="url(#logoBg)" />
      <rect x="418" y="242" width="24" height="28" fill="url(#logoBg)" />
      <rect x="230" y="420" width="52" height="24" fill="url(#logoBg)" />
      <rect x="70" y="242" width="24" height="28" fill="url(#logoBg)" />
      {/* Compass star */}
      <polygon points="256,72 272,232 256,256 240,232" fill="#2E86F0" />
      <polygon points="256,440 240,280 256,256 272,280" fill="#2E86F0" />
      <polygon points="420,256 280,240 256,256 280,272" fill="#2E86F0" opacity="0.75" />
      <polygon points="92,256 232,272 256,256 232,240" fill="#2E86F0" opacity="0.75" />
      <circle cx="256" cy="256" r="16" fill="#2E86F0" opacity="0.6" />
    </svg>
  )
}
