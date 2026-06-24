// First TypeScript module — Phase 002 convention proof (test-first, strict, kebab-named).
// Keeps a number within an inclusive [min, max] range.
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
