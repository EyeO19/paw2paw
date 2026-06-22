export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[];

export function clsx(inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input) {
      continue;
    }

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
      continue;
    }

    if (Array.isArray(input)) {
      const nested = clsx(input);
      if (nested) {
        out.push(nested);
      }
    }
  }

  return out.join(" ");
}
