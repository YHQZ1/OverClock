/** A request: a little avatar chip. Drawn at the origin, placed by its parent. */
export function Chip({ color, size = 26 }: { color: string; size?: number }) {
  const h = size / 2;
  return (
    <g>
      <rect x={-h} y={-h} width={size} height={size} rx={7} fill={color} stroke="#0d0d0d" strokeWidth={3.2} />
      <circle cy={-3.5} r={4.6} fill="#0d0d0d" />
      <path d="M-7.5 8.5a7.5 7 0 0 1 15 0z" fill="#0d0d0d" />
    </g>
  );
}

/** A bot: the same chip, but coral, with an antenna and a visor. */
export function BotChip({ size = 26 }: { size?: number }) {
  const h = size / 2;
  return (
    <g>
      <rect x={-h} y={-h} width={size} height={size} rx={5} fill="var(--color-attack)" stroke="#0d0d0d" strokeWidth={3.2} />
      <rect x={-8} y={-5} width={16} height={7} fill="#0d0d0d" />
      <path d="M0 -13v-6" stroke="#0d0d0d" strokeWidth={3} />
      <circle cy={-21} r={2.8} fill="#ffd23f" stroke="#0d0d0d" strokeWidth={2} />
      <path d="M-5 6h10" stroke="#ffd23f" strokeWidth={2.5} />
    </g>
  );
}

/** Shirt colours: the app's crowd colour plus three friends. */
export const SHIRTS = ["var(--arena-crowd)", "#ffd23f", "#4cc9f0", "#ff9ecb"];
