/**
 * Client-side diagnostics for the read path.
 *
 * The Aggregate view is a tree of sums, and a sum reports a wrong answer the
 * same way it reports a right one — silently. These channels exist so a bad
 * number can be traced to the step that produced it: what the wire carried,
 * what survived decoding, and what the refresh pass actually changed.
 *
 * Off by default. Enable from the console (main thread) or from INIT:
 *
 *   __INDEXUS_DEBUG__ = true                 // every channel
 *   __INDEXUS_DEBUG__ = "sets,refresh,reconcile"
 *
 * In a Web Worker the main-thread global is a different realm. Aggregate
 * passes `debugSdk` on INIT, and the worker mirrors each line back to the
 * page console via `setDebugSink` → `DEBUG_LOG`.
 */

/** @typedef {"sets" | "refresh" | "cube" | "reconcile"} Channel */

const CHANNELS = ["sets", "refresh", "cube", "reconcile"];

/** @type {Set<string> | null} — null means "not configured, read the global". */
let enabled = null;

/** @type {null | ((channel: string, event: string, fields?: object) => void)} */
let sink = null;

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
 * Optional fan-out used by the Aggregate worker to mirror lines into the
 * page DevTools console (worker `console` is a separate realm).
 * @param {null | ((channel: string, event: string, fields?: object) => void)} fn
 */
export function setDebugSink(fn) {
  sink = typeof fn === "function" ? fn : null;
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
  // When a sink mirrors into the page console (Aggregate worker → DEBUG_LOG),
  // skip the local console — otherwise every line appears twice in DevTools.
  if (sink) {
    try {
      sink(channel, event, fields);
    } catch {
      /* never let diagnostics break a read */
    }
    return;
  }
  if (fields === undefined) {
    console.info(`[indexus:${channel}] ${event}`);
  } else {
    console.info(`[indexus:${channel}] ${event}`, fields);
  }
}

/** Signed number, so a delta reads as a delta rather than as a value. */
export function signed(n) {
  if (!Number.isFinite(n)) return "n/a";
  return n > 0 ? `+${n}` : String(n);
}
