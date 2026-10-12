'use client';

import React from 'react';

interface RobotAvatarProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  size = 40,
  className = '',
  glow = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: glow ? 'drop-shadow(0px 0px 8px rgba(55, 243, 255, 0.6))' : 'none',
        display: 'block',
      }}
      aria-label="Aria Robot Avatar"
    >
      {/* Outer Head Frame / Helmet */}
      <rect
        x="20"
        y="18"
        width="60"
        height="44"
        rx="18"
        fill="#E8F1FC"
        stroke="#BDD3EB"
        strokeWidth="2.5"
      />

      {/* Ears / Side Nodes */}
      <rect x="13" y="30" width="8" height="20" rx="4" fill="#C5D9F0" />
      <rect x="79" y="30" width="8" height="20" rx="4" fill="#C5D9F0" />

      {/* Screen / Visor */}
      <rect
        x="27"
        y="25"
        width="46"
        height="30"
        rx="12"
        fill="#0B132B"
      />

      {/* Cyan Eyes */}
      <ellipse cx="40" cy="40" rx="4.5" ry="5.5" fill="#37F3FF" />
      <ellipse cx="60" cy="40" rx="4.5" ry="5.5" fill="#37F3FF" />
      {/* Eye Glow Highlights */}
      <circle cx="41.5" cy="38.5" r="1.5" fill="#FFFFFF" />
      <circle cx="61.5" cy="38.5" r="1.5" fill="#FFFFFF" />

      {/* Neck */}
      <rect x="42" y="62" width="16" height="6" rx="3" fill="#A8BFDB" />

      {/* Body / Torso */}
      <path
        d="M28 72 C28 67 36 65 50 65 C64 65 72 67 72 72 L75 88 C75 92 70 94 50 94 C30 94 25 92 25 88 Z"
        fill="#E8F1FC"
        stroke="#BDD3EB"
        strokeWidth="2"
      />

      {/* Torso Cyan Chest Accent */}
      <path
        d="M38 74 C44 78 56 78 62 74"
        stroke="#37F3FF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Cute Arms */}
      <path
        d="M25 72 C19 76 18 84 21 88"
        stroke="#C5D9F0"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M75 72 C81 76 82 84 79 88"
        stroke="#C5D9F0"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};
