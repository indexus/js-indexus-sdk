import { Item } from "../entities/item.js";
import { Set } from "../entities/set.js";

/**
 * Single-item rows use either `childHash:itemReference` or a bare hash segment
 * (Go shrink / leaf entries). Only the colon form existed historically in JS.
 */
function itemKeyParts(key) {
  if (typeof key !== "string" || key.length === 0) {
    return null;
  }
  const i = key.indexOf(":");
  if (i <= 0) {
    return { hash: key, reference: key };
  }
  const hash = key.slice(0, i);
  const reference = key.slice(i + 1);
  if (!reference) {
    return { hash, reference: hash };
  }
  return { hash, reference };
}

/**
 * @param {Object<string, { count: number, metrics?: number[] }>} setData
 * @param {string} collection
 * @returns {Array<Item|Set>}
 */
export function parseSetMap(setData, collection) {
  if (!setData || typeof setData !== "object") {
    return [];
  }
  const elements = [];
  for (const [key, value] of Object.entries(setData)) {
    if (!value || typeof value.count !== "number") {
      continue;
    }
    if (value.count === 1) {
      const parts = itemKeyParts(key);
      if (!parts) {
        continue;
      }
      elements.push(
        new Item(collection, parts.hash, value.metrics, parts.reference)
      );
    } else {
      elements.push(new Set(collection, key, value.count, value.metrics));
    }
  }
  return elements;
}
