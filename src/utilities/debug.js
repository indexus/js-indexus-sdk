/**
 * Client-side diagnostics for the read path.
 *
 * The Aggregate view is a tree of sums, and a sum reports a wrong answer the
 * same way it reports a right one — silently. These channels exist so a bad
 * number can be traced to the step that produced it: what the wire carried,
 * what survived decoding, and what the refresh pass actually changed.
 *
 * Off by default. Enable from the console or from INIT:
 *
 *   __INDEXUS_DEBUG__ = true            // every channel
 *   __INDEXUS_DEBUG__ = "sets,refresh"  // pick channels
 */

/** @typedef {"sets" | "refresh" | "cube"} Channel */

const CHANNELS = ["sets", "refresh", "cube"];

/** @type {Set<string> | null} — null means "not configured, read the global". */
let enabled = null;

function fromGlobal() {
  const raw = globalThis.__INDEXUS_DEBUG__;
  if (raw === true) return new Set(CHANNELS);
  if (typeof raw === "string" && raw.trim()) {
    if (raw.trim() === "*") return new Set(CHANNELS);
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }
  return new Set();
}

/**
 * @param {boolean | string | string[] | null} config
 *   true / "*" for everything, a list to pick channels, false to silence.
 */
export function setDebug(config) {
  if (config === true || config === "*") {
    enabled = new Set(CHANNELS);
  } else if (typeof config === "string") {
    enabled = new Set(config.split(",").map((s) => s.trim()).filter(Boolean));
  } else if (Array.isArray(config)) {
    enabled = new Set(config);
  } else {
    enabled = new Set();
  }
  globalThis.__INDEXUS_DEBUG__ = enabled.size ? [...enabled].join(",") : false;
}

/**
 * @param {Channel} channel
 * @returns {boolean}
 */
export function debugEnabled(channel) {
  // Re-read the global every call while unconfigured, so toggling
  // `__INDEXUS_DEBUG__` from the console takes effect without a reload.
  const active = enabled ?? fromGlobal();
  return active.has(channel);
}

/**
 * @param {Channel} channel
 * @param {string} event
 * @param {object} [fields] - flat key/value pairs, printed as one line.
 */
export function debugLog(channel, event, fields) {
  if (!debugEnabled(channel)) return;
  if (fields === undefined) {
    console.info(`[indexus:${channel}] ${event}`);
    return;
  }
  console.info(`[indexus:${channel}] ${event}`, fields);
}

/** Signed number, so a delta reads as a delta rather than as a value. */
export function signed(n) {
  if (!Number.isFinite(n)) return "n/a";
  return n > 0 ? `+${n}` : String(n);
}
