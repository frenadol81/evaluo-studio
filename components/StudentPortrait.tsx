import React from 'react';

interface StudentPortraitProps {
  src: string;
  name: string;
  thumbnail?: boolean;
}

export function StudentPortrait({ src, name, thumbnail = false }: StudentPortraitProps) {
  if (thumbnail) {
    return (
      <span className="block h-7 w-7 shrink-0 overflow-hidden rounded-full">
        <img
          src={src}
          alt=""
          className="h-full w-full origin-top object-cover object-top scale-125"
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
