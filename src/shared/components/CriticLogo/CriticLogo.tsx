'use client';

import React from 'react';
import Link from 'next/link';
import styles from './CriticLogo.module.css';

interface CriticLogoProps {
  href?: string;
  className?: string;
  onClick?: () => void;
}

export const CriticLogo: React.FC<CriticLogoProps> = ({
  href = '/',
  className = '',
  onClick,
}) => {
  if (onClick) {
    return (
      <span
        onClick={onClick}
        className={`${styles.logo} ${className}`}
        role="button"
        tabIndex={0}
      >
        Critic
      </span>
    );
  }

  return (
    <Link href={href} className={`${styles.logo} ${className}`}>
      Critic
    </Link>
  );
};
