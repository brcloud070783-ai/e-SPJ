import React from 'react';

export const KaltaraEmblem: React.FC<{
  className?: string;
  logoDataUrl?: string;
}> = ({ className = 'w-20 h-24', logoDataUrl }) => {
  if (logoDataUrl && logoDataUrl.trim()) {
    return (
      <img
        src={logoDataUrl}
        alt="Lambang Pemerintah Provinsi Kalimantan Utara"
        referrerPolicy="no-referrer"
        className={`${className} object-contain`}
      />
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 240"
      className={className}
      role="img"
      aria-label="Lambang Pemerintah Provinsi Kalimantan Utara"
    >
      {/* Outer Crowned Shield of Kalimantan Utara */}
      <path
        d="M100 8 L184 34 L184 128 C184 186 144 218 100 234 C56 218 16 186 16 128 L16 34 Z"
        fill="#38bdf8"
        stroke="#eab308"
        strokeWidth="6"
      />
      <path
        d="M100 16 L174 39 L174 126 C174 178 138 206 100 222 C62 206 26 178 26 126 L26 39 Z"
        fill="#7dd3fc"
        stroke="#0284c7"
        strokeWidth="2"
      />
      {/* Top Gold Star */}
      <polygon
        points="100,22 106,37 122,38 110,48 114,64 100,55 86,64 90,48 78,38 94,37"
        fill="#facc15"
        stroke="#a16207"
        strokeWidth="1.5"
      />
      {/* Green Mountains / Forest Canopy */}
      <path d="M40 120 Q70 84 100 108 Q130 84 160 120 Z" fill="#15803d" />
      {/* Paddy & Cotton Wreath Left & Right */}
      <path
        d="M46 66 C34 106 44 150 74 176"
        fill="none"
        stroke="#eab308"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M154 66 C166 106 156 150 126 176"
        fill="none"
        stroke="#16a34a"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Center Cultural Shield (Telabang / Mandau / Tombak) */}
      <polygon
        points="100,66 128,84 128,132 100,154 72,132 72,84"
        fill="#1e293b"
        stroke="#facc15"
        strokeWidth="3"
      />
      <polygon points="100,74 120,88 100,110 80,88" fill="#dc2626" />
      <polygon points="100,110 120,126 100,146 80,126" fill="#ffffff" />
      {/* Red & White Gate Arch */}
      <path d="M62 146 L138 146 L134 156 L66 156 Z" fill="#dc2626" />
      <path d="M68 156 L132 156 L128 164 L72 164 Z" fill="#ffffff" />
      {/* Sea Waves */}
      <path
        d="M46 174 Q73 166 100 174 T154 174"
        fill="none"
        stroke="#0369a1"
        strokeWidth="4"
      />
      <path
        d="M54 184 Q77 177 100 184 T146 184"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
      />
      {/* Bottom Motto Ribbon "BENUANTA" */}
      <path
        d="M36 196 Q100 212 164 196 L158 214 Q100 228 42 214 Z"
        fill="#facc15"
        stroke="#854d0e"
        strokeWidth="2"
      />
      <text
        x="100"
        y="211"
        fontFamily="sans-serif"
        fontSize="12"
        fontWeight="bold"
        fill="#0f172a"
        textAnchor="middle"
      >
        BENUANTA
      </text>
    </svg>
  );
};
