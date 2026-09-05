import React from 'react';

interface SkeletonLoaderProps {
  height?: string | number;
  width?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  height = '20px',
  width = '100%',
  borderRadius = 'var(--radius-xs)',
  style,
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(22, 42, 74, 0.4) 25%, rgba(56, 189, 248, 0.12) 50%, rgba(22, 42, 74, 0.4) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonWave 1.8s infinite ease-in-out',
        ...style,
      }}
    />
  );
};
