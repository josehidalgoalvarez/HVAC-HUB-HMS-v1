
/**
 * Calculates a Manhattan routing path (Vertical then Horizontal) between two points.
 * Returns an SVG path data string.
 * 
 * @param x1 Start X (percentage)
 * @param y1 Start Y (percentage)
 * @param x2 End X (percentage)
 * @param y2 End Y (percentage)
 * @returns SVG path string
 */
export const getManhattanPath = (x1: number, y1: number, x2: number, y2: number): string => {
  // Add slight offset (+5%) to y1 to start below the node center
  // This assumes nodes are centered at the coordinate
  return `M ${x1}% ${y1 + 5}% V ${y2}% H ${x2}%`;
};

/**
 * Calculates a simple direct line path for utilities.
 * 
 * @param x1 Start X (percentage)
 * @param y1 Start Y (percentage)
 * @param x2 End X (percentage)
 * @param y2 End Y (percentage)
 * @returns SVG path string
 */
export const getDirectPath = (x1: number, y1: number, x2: number, y2: number): string => {
  return `M ${x1}% ${y1}% L ${x2}% ${y2}%`;
};
