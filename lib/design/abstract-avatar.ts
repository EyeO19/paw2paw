const AVATAR_SHAPES = ["circle", "rounded-square", "soft-hexagon"] as const;
const AVATAR_COLORS = [
  "#FFAE76",
  "#F47323",
  "#5E8C5C",
  "#6B7C8F",
  "#C68B3C",
] as const;

type AvatarShape = (typeof AVATAR_SHAPES)[number];

function seedFromHash(hashedDisplayId: string): number {
  const seed = hashedDisplayId.slice(0, 8);
  let value = 0;

  for (let i = 0; i < seed.length; i += 1) {
    value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return value;
}

export function getAbstractAvatarStyle(hashedDisplayId: string): {
  shape: AvatarShape;
  color: string;
  borderRadius: string;
} {
  const seed = seedFromHash(hashedDisplayId);
  const shape = AVATAR_SHAPES[seed % AVATAR_SHAPES.length];
  const color = AVATAR_COLORS[seed % AVATAR_COLORS.length];

  const borderRadius =
    shape === "circle"
      ? "9999px"
      : shape === "rounded-square"
        ? "30%"
        : "35%";

  return { shape, color, borderRadius };
}
