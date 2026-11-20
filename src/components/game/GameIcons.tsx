import type { UnitRole } from '../../game/types';

export function InkfolkTitleLockup() {
  return (
    <svg
      viewBox="0 0 280 86"
      className="w-64 sm:w-72 h-auto mx-auto"
      role="img"
      aria-label="Inkfolk Clash"
    >
      {/* Crossed tribal pen-ink spears behind crest */}
      <path
        d="M84 62L196 14M196 62L84 14"
        stroke="#6B5344"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Warm gold tribal crown emblem */}
      <path
        d="M118 28L108 12l16 7 16-13 16 13 16-7-10 16z"
        fill="#C98A2C"
        stroke="#3A2B23"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Handwritten-feel serif lockup */}
      <text
        x="140"
        y="58"
        textAnchor="middle"
        fill="#3A2B23"
        stroke="#F9F3E6"
        strokeWidth="5"
        paintOrder="stroke fill"
        style={{
          fontFamily: '"Fraunces", Georgia, serif',
          fontWeight: 800,
          fontSize: '30px',
          letterSpacing: '-0.01em',
        }}
      >
        Inkfolk Clash
      </text>
      <path
        d="M66 70c44 4 104 4 148 0"
        fill="none"
        stroke="#A4423C"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RationBreadIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} aria-hidden="true">
      <path
        d="M4.5 13.5c0-4.2 3.3-7.5 7.5-7.5s7.5 3.3 7.5 7.5c0 2.5-1.5 4.2-4.2 4.2H8.7c-2.7 0-4.2-1.7-4.2-4.2z"
        fill="#D49A45"
        stroke="#3A2B23"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9.5l2 2.4M12 8.8l2 2.4M15.5 9.8l1.6 2"
        stroke="#F9F3E6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FlorinCoinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="#D99B32" stroke="#3A2B23" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="#3A2B23" strokeWidth="1.3" opacity="0.6" />
    </svg>
  );
}

export function UnitBadgeSvg({ role }: { role: UnitRole }) {
  if (role === 'melee') {
    return (
      <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
        <path
          d="M5.5 10.5c4.5-4.5 12-4.5 16.5 0"
          fill="none"
          stroke="#C98A2C"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M19.5 4.5l4 4-9.5 9.5 2 2-2 2-3.5-3.5-4 4-2-2 4-4-3.5-3.5 2-2 2 2 9.5-9.5z"
          fill="#D7E0E6"
          stroke="#3A2B23"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M11 16.5l8.5-8.5" stroke="#2E6F7E" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (role === 'ranged') {
    return (
      <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
        <path
          d="M7 21C7 12 12 7 21 7"
          fill="none"
          stroke="#3A2B23"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path d="M7 21L21 7" stroke="#2E6F7E" strokeWidth="1.4" />
        <path
          d="M11 17l10-10m0 0h-5m5 0v5"
          fill="none"
          stroke="#C98A2C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
      {/* Radiant Sun-Core Greatsword + Brass Mech Emblem (Victory CG III) */}
      <path
        d="M14 2.8 L18.2 7.5 L17.4 18.2 L10.6 18.2 L9.8 7.5 Z"
        fill="#F4E7BE"
        stroke="#3A2B23"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Luminous golden fuller core */}
      <path
        d="M14 5.5 L15.4 15.8 L12.6 15.8 Z"
        fill="#E9BA58"
      />
      {/* Sculpted brass crossguard */}
      <path
        d="M6.5 18.2 L21.5 18.2 L19.8 20.8 L8.2 20.8 Z"
        fill="#C98A2C"
        stroke="#3A2B23"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Glowing Sun-Core ring at hilt */}
      <circle cx="14" cy="17.8" r="2.1" fill="#FFF7C2" stroke="#3A2B23" strokeWidth="1.3" />
      {/* Grip & pommel */}
      <path d="M14 20.8 V24.5" stroke="#3A2B23" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="14" cy="25.2" r="1.6" fill="#2E6F7E" stroke="#3A2B23" strokeWidth="1.2" />
    </svg>
  );
}
