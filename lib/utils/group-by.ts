export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return groups;
}
