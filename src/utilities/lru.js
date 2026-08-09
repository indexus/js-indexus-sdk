/** Touch an existing Map entry and move it to the LRU tail. */
export function touchLru(map, key) {
  if (!map.has(key)) return undefined;
  const value = map.get(key);
  map.delete(key);
  map.set(key, value);
  return value;
}

/**
 * Put an entry at the LRU tail and evict the oldest key when full.
 * `onEvict` keeps parallel metadata maps in sync.
 */
export function putLru(map, key, value, maxSize, onEvict = null) {
  if (map.has(key)) map.delete(key);
  if (map.size >= maxSize) {
    const oldest = map.keys().next().value;
    map.delete(oldest);
    onEvict?.(oldest);
  }
  map.set(key, value);
}
