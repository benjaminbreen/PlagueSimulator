/**
 * Calculate the 8-way compass direction from one position to another
 * @param fromX - Origin X coordinate
 * @param fromZ - Origin Z coordinate
 * @param toX - Destination X coordinate
 * @param toZ - Destination Z coordinate
 * @returns Compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export const calculateDirection = (
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number
): string => {
  const dx = toX - fromX;
  const dz = toZ - fromZ;

  // Calculate angle in radians (0 = East, counter-clockwise)
  const angle = Math.atan2(dz, dx);

  // Convert to degrees (0 = East, counter-clockwise)
  let degrees = (angle * 180) / Math.PI;

  // Rotate so that 0° = North (subtract 90°)
  degrees = degrees - 90;

  // Normalize to 0-360
  if (degrees < 0) degrees += 360;

  // 8-way compass divisions (45° each)
  // North: 337.5° - 22.5° (or -22.5° to 22.5° from north)
  if (degrees >= 337.5 || degrees < 22.5) return 'north';
  if (degrees >= 22.5 && degrees < 67.5) return 'northeast';
  if (degrees >= 67.5 && degrees < 112.5) return 'east';
  if (degrees >= 112.5 && degrees < 157.5) return 'southeast';
  if (degrees >= 157.5 && degrees < 202.5) return 'south';
  if (degrees >= 202.5 && degrees < 247.5) return 'southwest';
  if (degrees >= 247.5 && degrees < 292.5) return 'west';
  if (degrees >= 292.5 && degrees < 337.5) return 'northwest';

  return 'north'; // Fallback
};

/**
 * Format district name for display
 * @param district - District type enum value
 * @returns Formatted district name
 */
export const formatDistrictName = (district: string): string => {
  return district
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
