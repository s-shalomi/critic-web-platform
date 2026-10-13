'use client';

import React from 'react';

export type RobotVariant =
  | 'violet'
  | 'yellow'
  | 'aria'
  | 'blue'
  | 'emerald'
  | 'crimson'
  | 'frost'
  | 'stealth'
  | 'gold';

export interface AvatarOption {
  id: RobotVariant;
  name: string;
  accentColor: string;
}

/**
 * Ordered list of 9 avatars for the infinite circular carousel.
 * Default 'aria' is at index 2 (3rd dot), flanked by 'yellow' (index 1) on the left
 * and 'blue' (index 3) on the right, matching screens_v2/customise.png.
 */
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'violet', name: 'Nova', accentColor: '#C084FC' },
  { id: 'yellow', name: 'Spark', accentColor: '#F59E0B' },
  { id: 'aria', name: 'Aria', accentColor: '#37F3FF' },
  { id: 'blue', name: 'Bolt', accentColor: '#60A5FA' },
  { id: 'emerald', name: 'Echo', accentColor: '#34D399' },
  { id: 'crimson', name: 'Blaze', accentColor: '#F87171' },
  { id: 'frost', name: 'Glacia', accentColor: '#38BDF8' },
  { id: 'stealth', name: 'Cipher', accentColor: '#818CF8' },
  { id: 'gold', name: 'Sol', accentColor: '#FBBF24' },
];

export interface ToneOption {
  id: string;
  name: string;
  desc: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'friendly',
    name: 'Friendly',
    desc: 'Encouraging, warm, and highly engaging without being overly corporate. Uses natural Gen Z phrasing, light humor, and supportive language.',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    desc: 'Relatable, calm, and non-judgmental. They ask probing questions that encourage deeper thought and self-discovery.',
  },
  {
    id: 'witty_challenger',
    name: 'Witty Challenger',
    desc: 'Playful, sharp, and strategic. Uses wit, light roasts, and clever provocations to sharpen thinking.',
  },
  {
    id: 'curious_explorer',
    name: 'Curious Explorer',
    desc: "Gentle and curious. They show interest in the user's ideas and offer encouragement.",
  },
  {
    id: 'devils_advocate',
    name: "Devil's Advocate",
    desc: 'Challenges assumptions and beliefs, pushing the user to consider alternative perspectives.',
  },
];

export interface ResolvedAgentPreferences {
  appearance: RobotVariant;
  avatarName: string;
  accentColor: string;
  toneId: string;
  toneName: string;
  toneDesc: string;
}

export const DEFAULT_AGENT_PREFERENCES: ResolvedAgentPreferences = {
  appearance: 'aria',
  avatarName: 'Aria',
  accentColor: '#37F3FF',
  toneId: 'friendly',
  toneName: 'Friendly',
  toneDesc: TONE_OPTIONS[0].desc,
};

export function getStoredAgentPreferences(): ResolvedAgentPreferences {
  let appearance: RobotVariant = 'aria';
  let matchedTone: ToneOption = TONE_OPTIONS[0];

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('critic_agent_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.appearance && AVATAR_OPTIONS.some((a) => a.id === parsed.appearance)) {
          appearance = parsed.appearance;
        }
        if (parsed.tone) {
          const rawTone = String(parsed.tone).trim().toLowerCase();
          const foundTone = TONE_OPTIONS.find(
            (t) => t.id.toLowerCase() === rawTone || t.name.toLowerCase() === rawTone
          );
          if (foundTone) {
            matchedTone = foundTone;
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  const avatarObj = AVATAR_OPTIONS.find((a) => a.id === appearance) || AVATAR_OPTIONS[2];

  return {
    appearance: avatarObj.id,
    avatarName: avatarObj.name,
    accentColor: avatarObj.accentColor,
    toneId: matchedTone.id,
    toneName: matchedTone.name,
    toneDesc: matchedTone.desc,
  };
}

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
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(245, 158, 11, 0.55))' : 'none',
          display: 'block',
        }}
        aria-label="Spark Yellow Robot Avatar"
      >
        {/* Antenna */}
        <circle cx="50" cy="14" r="4.5" fill="#F59E0B" stroke="#78350F" strokeWidth="1.5" />
        <rect x="48.5" y="18" width="3" height="9" fill="#D97706" />

        {/* Head */}
        <ellipse cx="50" cy="43" rx="28" ry="22" fill="#FBBF24" stroke="#B45309" strokeWidth="2.5" />
        {/* Forehead Metallic Plate */}
        <path d="M36 27 C43 24 57 24 64 27" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

        {/* Ears */}
        <rect x="17" y="36" width="6" height="14" rx="3" fill="#D97706" stroke="#78350F" strokeWidth="1.5" />
        <rect x="77" y="36" width="6" height="14" rx="3" fill="#D97706" stroke="#78350F" strokeWidth="1.5" />
        <circle cx="15" cy="43" r="2" fill="#78350F" />
        <circle cx="85" cy="43" r="2" fill="#78350F" />

        {/* Eyes & Smile */}
        <circle cx="39" cy="42" r="5" fill="#1E293B" />
        <circle cx="61" cy="42" r="5" fill="#1E293B" />
        <circle cx="40.5" cy="40.5" r="1.8" fill="#FFFFFF" />
        <circle cx="62.5" cy="40.5" r="1.8" fill="#FFFFFF" />
        <path d="M44 50 C47 53.5 53 53.5 56 50" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />

        {/* Neck */}
        <rect x="45" y="65" width="10" height="4" rx="2" fill="#B45309" />

        {/* Body */}
        <path
          d="M35 70 C35 67 42 66 50 66 C58 66 65 67 65 70 L67 86 C67 90 61 92 50 92 C39 92 33 90 33 86 Z"
          fill="#F59E0B"
          stroke="#B45309"
          strokeWidth="2.2"
        />
        <circle cx="50" cy="79" r="4.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />

        {/* Arms */}
        <path d="M32 72 C23 76 23 84 27 87" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M68 72 C77 76 77 84 73 87" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
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
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(96, 165, 250, 0.55))' : 'none',
          display: 'block',
        }}
        aria-label="Bolt Blue Robot Avatar"
      >
        {/* Antennae */}
        <path d="M35 25 L30 16" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <circle cx="29" cy="15" r="3.5" fill="#DBEAFE" />
        <path d="M65 25 L70 16" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <circle cx="71" cy="15" r="3.5" fill="#DBEAFE" />

        {/* Head */}
        <ellipse cx="50" cy="43" rx="26" ry="20" fill="#60A5FA" stroke="#2563EB" strokeWidth="2.5" />
        <ellipse cx="50" cy="34" rx="16" ry="7" fill="#93C5FD" opacity="0.45" />

        {/* Cheeks */}
        <ellipse cx="33" cy="46" rx="3.2" ry="2" fill="#F472B6" opacity="0.85" />
        <ellipse cx="67" cy="46" rx="3.2" ry="2" fill="#F472B6" opacity="0.85" />

        {/* Eyes & Smile */}
        <circle cx="41" cy="42" r="4" fill="#0F172E" />
        <circle cx="59" cy="42" r="4" fill="#0F172E" />
        <circle cx="42.2" cy="40.5" r="1.5" fill="#FFFFFF" />
        <circle cx="60.2" cy="40.5" r="1.5" fill="#FFFFFF" />
        <path d="M47 46.5 C48.5 48.5 51.5 48.5 53 46.5" stroke="#0F172E" strokeWidth="2" strokeLinecap="round" />

        {/* Body */}
        <rect x="35" y="63" width="30" height="26" rx="12" fill="#60A5FA" stroke="#2563EB" strokeWidth="2.2" />
        <rect x="42" y="69" width="16" height="12" rx="3" fill="#BFDBFE" opacity="0.8" />

        {/* Hands */}
        <ellipse cx="29" cy="74" rx="4.5" ry="7.5" transform="rotate(15 29 74)" fill="#3B82F6" />
        <ellipse cx="71" cy="74" rx="4.5" ry="7.5" transform="rotate(-15 71 74)" fill="#3B82F6" />
      </svg>
    );
  }

  if (variant === 'violet') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(192, 132, 252, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Nova Violet Robot Avatar"
      >
        {/* Halo / Crest */}
        <path d="M34 16 Q50 10 66 16" stroke="#C084FC" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="13" r="3.5" fill="#E879F9" />

        {/* Head */}
        <rect x="22" y="20" width="56" height="42" rx="16" fill="#2E1065" stroke="#A855F7" strokeWidth="2.5" />
        <rect x="15" y="32" width="7" height="18" rx="3.5" fill="#7E22CE" />
        <rect x="78" y="32" width="7" height="18" rx="3.5" fill="#7E22CE" />

        {/* Visor */}
        <rect x="29" y="27" width="42" height="26" rx="10" fill="#090514" stroke="#C084FC" strokeWidth="1.2" />
        {/* Eyes */}
        <path d="M36 40 Q40 35 44 40" stroke="#E879F9" strokeWidth="3" strokeLinecap="round" />
        <path d="M56 40 Q60 35 64 40" stroke="#E879F9" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="46" r="2" fill="#C084FC" />

        {/* Body */}
        <path d="M30 68 C30 64 38 63 50 63 C62 63 70 64 70 68 L73 88 C73 92 66 94 50 94 C34 94 27 92 27 88 Z" fill="#3B0764" stroke="#A855F7" strokeWidth="2.2" />
        <path d="M39 74 L50 80 L61 74" stroke="#E879F9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 71 C20 75 20 83 23 87" stroke="#A855F7" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M74 71 C80 75 80 83 77 87" stroke="#A855F7" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'emerald') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(52, 211, 153, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Echo Emerald Robot Avatar"
      >
        {/* Sprout Antenna */}
        <path d="M50 20 L50 12" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 14 C55 10 60 12 58 16 C56 18 52 17 50 14 Z" fill="#34D399" />

        {/* Head */}
        <rect x="23" y="21" width="54" height="40" rx="20" fill="#ECFDF5" stroke="#10B981" strokeWidth="2.5" />
        <rect x="30" y="27" width="40" height="26" rx="12" fill="#064E3B" />

        {/* Eyes */}
        <circle cx="41" cy="40" r="4.5" fill="#34D399" />
        <circle cx="59" cy="40" r="4.5" fill="#34D399" />
        <circle cx="42.5" cy="38.5" r="1.5" fill="#FFFFFF" />
        <circle cx="60.5" cy="38.5" r="1.5" fill="#FFFFFF" />
        <path d="M46 46 Q50 49 54 46" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />

        {/* Body */}
        <rect x="32" y="64" width="36" height="27" rx="13" fill="#ECFDF5" stroke="#10B981" strokeWidth="2.2" />
        <circle cx="50" cy="77" r="5" fill="#34D399" />
        <path d="M28 70 C22 74 22 82 25 85" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M72 70 C78 74 78 82 75 85" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'crimson') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(248, 113, 113, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Blaze Crimson Robot Avatar"
      >
        {/* Crest */}
        <polygon points="50,11 44,21 56,21" fill="#F87171" />
        {/* Head */}
        <rect x="22" y="21" width="56" height="41" rx="14" fill="#450A0A" stroke="#F87171" strokeWidth="2.5" />
        <rect x="16" y="33" width="6" height="16" rx="3" fill="#EF4444" />
        <rect x="78" y="33" width="6" height="16" rx="3" fill="#EF4444" />
        {/* Visor */}
        <rect x="29" y="28" width="42" height="24" rx="8" fill="#1F0909" />
        <polygon points="35,38 45,41 35,44" fill="#FCA5A5" />
        <polygon points="65,38 55,41 65,44" fill="#FCA5A5" />
        {/* Body */}
        <path d="M31 66 L69 66 L72 89 C72 92 64 94 50 94 C36 94 28 92 28 89 Z" fill="#7F1D1D" stroke="#F87171" strokeWidth="2.2" />
        <rect x="42" y="73" width="16" height="8" rx="2" fill="#FCA5A5" />
        <path d="M27 71 C21 75 21 83 24 87" stroke="#F87171" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M73 71 C79 75 79 83 76 87" stroke="#F87171" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'frost') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(56, 189, 248, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Glacia Frost Robot Avatar"
      >
        {/* Crystal Antenna */}
        <polygon points="50,10 45,18 50,22 55,18" fill="#7DD3FC" />
        {/* Head */}
        <rect x="24" y="21" width="52" height="41" rx="16" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="2.5" />
        <rect x="30" y="28" width="40" height="26" rx="10" fill="#082F49" />
        {/* Eyes */}
        <rect x="37" y="36" width="7" height="9" rx="3.5" fill="#7DD3FC" />
        <rect x="56" y="36" width="7" height="9" rx="3.5" fill="#7DD3FC" />
        <path d="M46 48 L54 48" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" />
        {/* Body */}
        <path d="M32 66 C32 64 40 63 50 63 C60 63 68 64 68 66 L71 88 C71 92 63 94 50 94 C37 94 29 92 29 88 Z" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="2.2" />
        <polygon points="50,70 44,78 50,86 56,78" fill="#38BDF8" />
        <path d="M28 71 C22 75 22 83 25 87" stroke="#7DD3FC" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M72 71 C78 75 78 83 75 87" stroke="#7DD3FC" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'stealth') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(129, 140, 248, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Cipher Stealth Robot Avatar"
      >
        {/* Antenna */}
        <line x1="62" y1="20" x2="66" y2="11" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="67" cy="10" r="2.5" fill="#37F3FF" />
        {/* Head */}
        <rect x="22" y="20" width="56" height="42" rx="15" fill="#1E1B4B" stroke="#6366F1" strokeWidth="2.5" />
        <rect x="29" y="28" width="42" height="22" rx="8" fill="#090D16" stroke="#4F46E5" strokeWidth="1.2" />
        {/* Cyclops / Dual tactical visor */}
        <line x1="33" y1="39" x2="67" y2="39" stroke="#312E81" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="39" r="5" fill="#37F3FF" />
        <circle cx="51.5" cy="37.5" r="1.5" fill="#FFFFFF" />
        {/* Body */}
        <path d="M31 66 C31 63 39 62 50 62 C61 62 69 63 69 66 L72 88 C72 92 64 94 50 94 C36 94 28 92 28 88 Z" fill="#1E1B4B" stroke="#6366F1" strokeWidth="2.2" />
        <path d="M40 75 L60 75" stroke="#37F3FF" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M44 81 L56 81" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
        <path d="M27 71 C21 75 21 83 24 87" stroke="#6366F1" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M73 71 C79 75 79 83 76 87" stroke="#6366F1" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'gold') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          filter: glow ? 'drop-shadow(0px 0px 10px rgba(251, 191, 36, 0.6))' : 'none',
          display: 'block',
        }}
        aria-label="Sol Gold Robot Avatar"
      >
        {/* Crown ring */}
        <ellipse cx="50" cy="14" rx="12" ry="3.5" stroke="#FBBF24" strokeWidth="2.2" />
        {/* Head */}
        <rect x="22" y="20" width="56" height="42" rx="18" fill="#FEFCE8" stroke="#F59E0B" strokeWidth="2.5" />
        <rect x="29" y="27" width="42" height="27" rx="11" fill="#1C1917" />
        {/* Eyes */}
        <circle cx="40" cy="40" r="4.5" fill="#FBBF24" />
        <circle cx="60" cy="40" r="4.5" fill="#FBBF24" />
        <circle cx="41.5" cy="38.5" r="1.5" fill="#FFFFFF" />
        <circle cx="61.5" cy="38.5" r="1.5" fill="#FFFFFF" />
        <path d="M46 47 C48 49.5 52 49.5 54 47" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />
        {/* Body */}
        <path d="M30 66 C30 63 38 62 50 62 C62 62 70 63 70 66 L73 88 C73 92 65 94 50 94 C35 94 27 92 27 88 Z" fill="#FEFCE8" stroke="#F59E0B" strokeWidth="2.2" />
        <path d="M39 73 C45 77 55 77 61 73" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 71 C20 75 20 83 23 87" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M74 71 C80 75 80 83 77 87" stroke="#FBBF24" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Default 'aria' variant (matches center robot in screens_v2/customise.png)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        filter: glow ? 'drop-shadow(0px 0px 10px rgba(55, 243, 255, 0.55))' : 'none',
        display: 'block',
      }}
      aria-label="Aria Robot Avatar"
    >
      {/* Top Cap */}
      <path d="M40 18 C40 14 60 14 60 18" fill="#DCE8F7" stroke="#94A3B8" strokeWidth="2" />

      {/* Outer Head Frame / Helmet */}
      <rect
        x="20"
        y="18"
        width="60"
        height="44"
        rx="18"
        fill="#E8F1FC"
        stroke="#94A3B8"
        strokeWidth="2.5"
      />

      {/* Ears / Side Nodes */}
      <rect x="13" y="29" width="7" height="22" rx="3.5" fill="#C5D9F0" stroke="#94A3B8" strokeWidth="1.8" />
      <rect x="80" y="29" width="7" height="22" rx="3.5" fill="#C5D9F0" stroke="#94A3B8" strokeWidth="1.8" />

      {/* Screen / Visor */}
      <rect
        x="26"
        y="24"
        width="48"
        height="32"
        rx="13"
        fill="#0B132B"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Happy Arched Cyan Eyes + Smile matching screens_v2/customise.png */}
      <path d="M34 39 C34 34 43 34 43 39 Z" fill="#37F3FF" />
      <path d="M57 39 C57 34 66 34 66 39 Z" fill="#37F3FF" />
      <path d="M47 45 C47 49 53 49 53 45 Z" fill="#37F3FF" />

      {/* Neck */}
      <rect x="43" y="62" width="14" height="5" rx="2.5" fill="#94A3B8" />

      {/* Body / Torso */}
      <path
        d="M30 71 C30 66 38 65 50 65 C62 65 70 66 70 71 L68 88 C67 93 59 96 50 96 C41 96 33 93 32 88 Z"
        fill="#E8F1FC"
        stroke="#94A3B8"
        strokeWidth="2.2"
      />

      {/* Torso Cyan Chest Line matching screens_v2/customise.png */}
      <path
        d="M32 82 L41 85 L59 85 L68 82"
        stroke="#37F3FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Cute Arms */}
      <path
        d="M30 70 C21 74 19 86 24 91 C27 93 30 88 31 82"
        fill="#E8F1FC"
        stroke="#94A3B8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M70 70 C79 74 81 86 76 91 C73 93 70 88 69 82"
        fill="#E8F1FC"
        stroke="#94A3B8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

