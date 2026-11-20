import type { ArtStyleId, UnitRole } from '../../pitch/stylesConfig';

export function FoodIcon({ styleId, color }: { styleId: ArtStyleId; color: string }) {
  if (styleId === 'comic-pop') {
    // Lightning energy cell
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <path
          d="M13 2L4 14h6l-1 8 11-12h-6l-1-8z"
          fill={color}
          stroke="#111827"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (styleId === 'ukiyo-woodblock') {
    // Rice bale / grain sheaf
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
        <ellipse cx="12" cy="12" rx="8" ry="5.5" fill={color} stroke="#1C1917" strokeWidth="1.8" />
        <path d="M8 7.5v9M12 6.8v10.4M16 7.5v9" stroke="#1C1917" strokeWidth="1.5" />
      </svg>
    );
  }
  // Classic stylized meat/ration emblem
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path
        d="M15.5 4.5c2.8 0 4.8 2 4.8 4.8 0 3.7-3.4 6.7-7.3 8.4l-2.4 2.4a1.6 1.6 0 01-2.3-2.3l.6-.6-.6-.6a1.6 1.6 0 012.3-2.3l.6-.6c1.5-4.3 1.7-9.2 4.3-9.2z"
        fill={color}
        stroke="#2C221E"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="15.8" cy="8.5" r="1.4" fill="#FFF8EB" />
    </svg>
  );
}

export function CoinIcon({ color, stroke }: { color: string; stroke: string }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill={color} stroke={stroke} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke={stroke} strokeWidth="1.4" opacity="0.65" />
    </svg>
  );
}

export function UnitRoleIcon({
  role,
  primary,
  secondary,
  ink,
}: {
  role: UnitRole;
  primary: string;
  secondary: string;
  ink: string;
}) {
  if (role === 'melee') {
    return (
      <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
        <path
          d="M19.5 4.5l4 4-9.5 9.5 2 2-2 2-3.5-3.5-4 4-2-2 4-4-3.5-3.5 2-2 2 2 9.5-9.5z"
          fill={primary}
          stroke={ink}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M17.5 6.5l4 4" stroke={secondary} strokeWidth="1.6" />
      </svg>
    );
  }
  if (role === 'ranged') {
    return (
      <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
        <path
          d="M7 21C7 12 12 7 21 7"
          fill="none"
          stroke={ink}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M7 21L21 7" stroke={primary} strokeWidth="1.5" />
        <path
          d="M11 17l10-10m0 0h-5m5 0v5"
          fill="none"
          stroke={secondary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 28 28" className="w-7 h-7 shrink-0" aria-hidden="true">
      <path
        d="M14 3.5l8 3.2v6.8c0 5.4-3.4 9.5-8 11.2-4.6-1.7-8-5.8-8-11.2V6.7l8-3.2z"
        fill={primary}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M14 7v14M9.5 11.5h9"
        stroke={secondary}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TitleCrestEmblem({
  styleId,
  primary,
  secondary,
  accent,
  ink,
}: {
  styleId: ArtStyleId;
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
}) {
  return (
    <svg viewBox="0 0 120 44" className="w-28 h-11 mx-auto" aria-hidden="true">
      <path
        d="M22 28L10 14l14 4 8-12 8 12 14-4-12 14z"
        fill={accent}
        stroke={ink}
        strokeWidth="2.2"
        strokeLinejoin="round"
        transform="translate(28, 0)"
      />
      {styleId === 'ukiyo-woodblock' ? (
        <circle cx="60" cy="22" r="16" fill="none" stroke={primary} strokeWidth="2.2" strokeDasharray="4 2" />
      ) : (
        <path
          d="M12 24h26M82 24h26"
          stroke={secondary}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
