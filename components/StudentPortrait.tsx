import React from 'react';
import type { PhotoCrop } from '../types';

interface StudentPortraitProps {
  src: string;
  name: string;
  thumbnail?: boolean;
  crop?: PhotoCrop;
  size?: string;
}

export function StudentPortrait({ src, name, thumbnail = false, crop, size = 'h-7 w-7' }: StudentPortraitProps) {
  if (thumbnail) {
    const { x, y, zoom } = crop || { x: 50, y: 0, zoom: 1.25 };
    const position = `${x}% ${y}%`;
    return (
      <span className={`block ${size} shrink-0 overflow-hidden rounded-full bg-warm-100`}>
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: position, transformOrigin: position, transform: `scale(${zoom})` }}
        />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={`Foto de ${name}`}
      className="h-20 w-20 shrink-0 rounded-lg border border-warm-200 bg-white object-contain"
    />
  );
}
