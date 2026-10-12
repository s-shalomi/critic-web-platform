'use client';

import React from 'react';

export type RobotVariant = 'aria' | 'yellow' | 'blue';

interface RobotAvatarProps {
  size?: number;
  variant?: RobotVariant;
  className?: string;
  glow?: boolean;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  size = 40,
  variant = 'aria',
  className = '',
  glow = false,
}) => {
  if (variant === 'yellow') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 8px rgba(245, 158, 11, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Yellow Robot Avatar"
      >
        {/* Antenna */}
        <circle cx="50" cy="16" r="4" fill="#F59E0B" />
        <rect x="48.5" y="20" width="3" height="8" fill="#D97706" />

        {/* Head */}
        <ellipse cx="50" cy="42" rx="28" ry="22" fill="#FBBF24" stroke="#D97706" strokeWidth="2.5" />
        {/* Ears */}
        <rect x="18" y="36" width="6" height="12" rx="3" fill="#D97706" />
        <rect x="76" y="36" width="6" height="12" rx="3" fill="#D97706" />

        {/* Eyes & Smile */}
        <ellipse cx="40" cy="40" rx="3.5" ry="4.5" fill="#1E293B" />
        <ellipse cx="60" cy="40" rx="3.5" ry="4.5" fill="#1E293B" />
        <circle cx="41.5" cy="38.5" r="1.5" fill="#FFFFFF" />
        <circle cx="61.5" cy="38.5" r="1.5" fill="#FFFFFF" />
        <path d="M44 48 C47 52 53 52 56 48" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" />

        {/* Neck */}
        <rect x="45" y="64" width="10" height="5" rx="2" fill="#D97706" />

        {/* Body */}
        <path d="M35 70 C35 68 42 66 50 66 C58 66 65 68 65 70 L68 86 C68 89 62 91 50 91 C38 91 32 89 32 86 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
        <circle cx="50" cy="78" r="4" fill="#FEF3C7" />

        {/* Arms */}
        <path d="M31 72 C22 76 22 84 26 86" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
        <path d="M69 72 C78 76 78 84 74 86" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'blue') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 8px rgba(96, 165, 250, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Blue Chibi Robot Avatar"
      >
        {/* Antennae */}
        <path d="M35 24 L31 16" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <circle cx="30" cy="15" r="3.5" fill="#93C5FD" />
        <path d="M65 24 L69 16" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <circle cx="70" cy="15" r="3.5" fill="#93C5FD" />

        {/* Head */}
        <ellipse cx="50" cy="42" rx="26" ry="20" fill="#60A5FA" stroke="#3B82F6" strokeWidth="2.5" />

        {/* Cheeks */}
        <ellipse cx="33" cy="45" rx="3" ry="2" fill="#F472B6" opacity="0.8" />
        <ellipse cx="67" cy="45" rx="3" ry="2" fill="#F472B6" opacity="0.8" />

        {/* Eyes & Smile */}
        <ellipse cx="41" cy="41" rx="3.5" ry="4.5" fill="#0F172E" />
        <ellipse cx="59" cy="41" rx="3.5" ry="4.5" fill="#0F172E" />
        <circle cx="42" cy="39" r="1.5" fill="#FFFFFF" />
        <circle cx="60" cy="39" r="1.5" fill="#FFFFFF" />
        <path d="M47 46 C48.5 48 51.5 48 53 46" stroke="#0F172E" strokeWidth="2" strokeLinecap="round" />

        {/* Body */}
        <rect x="36" y="62" width="28" height="26" rx="10" fill="#60A5FA" stroke="#3B82F6" strokeWidth="2" />
        <rect x="42" y="68" width="16" height="12" rx="3" fill="#93C5FD" opacity="0.7" />

        {/* Hands */}
        <ellipse cx="30" cy="74" rx="4" ry="7" fill="#3B82F6" />
        <ellipse cx="70" cy="74" rx="4" ry="7" fill="#3B82F6" />
      </svg>
    );
  }

  // Default 'aria' variant
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
