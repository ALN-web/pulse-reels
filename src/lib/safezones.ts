/**
 * Instagram Reels safe zones for a 1080x1920 canvas.
 * Conservative values: the top bar (account/audio), the bottom caption + CTA area,
 * and the right-hand action buttons cover the video there.
 */
export const CANVAS = { width: 1080, height: 1920 } as const;

export const SAFE_ZONE = {
  top: 250,
  bottom: 420,
  left: 60,
  right: 150,
} as const;

/** The rectangle where captions and key text are allowed. */
export const SAFE_RECT = {
  x: SAFE_ZONE.left,
  y: SAFE_ZONE.top,
  width: CANVAS.width - SAFE_ZONE.left - SAFE_ZONE.right,
  height: CANVAS.height - SAFE_ZONE.top - SAFE_ZONE.bottom,
} as const;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function insideSafeZone(b: Box): boolean {
  return (
    b.x >= SAFE_RECT.x &&
    b.y >= SAFE_RECT.y &&
    b.x + b.width <= SAFE_RECT.x + SAFE_RECT.width &&
    b.y + b.height <= SAFE_RECT.y + SAFE_RECT.height
  );
}
