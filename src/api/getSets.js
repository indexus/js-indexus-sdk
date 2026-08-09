import axios from "axios";

import { getHostFromIP } from "../utilities/network.js";
import {
  decodeSetsBinary,
  binaryBlocksToElements,
  SETS_BINARY_PROPERTY_COUNT,
} from "./decodeSetsBinary.js";
import { decodeSetsEnvelope } from "./decodeSetsEnvelope.js";
import { authHeaders } from "./authHeaders.js";
import { encodeUrl64 } from "../utilities/encoding.js";
import { debugEnabled, debugLog } from "../utilities/debug.js";

/**
 * @param {Record<string, string>} headers
 * @returns {{ name: string, ip: string, port: number } | null}
 */
function ingressFromHeaders(headers) {
  const name = headers["x-indexus-ingress-name"];
  const ip = headers["x-indexus-ingress-ip"];
  const port = Number(headers["x-indexus-ingress-port"]);
  if (!name || !ip || !(port > 0)) return null;
  return { name, ip, port };
}

/**
 * Batch fetch via GET `/sets` (binary). Both ingress and direct navigation use
 * this wire format; `envelope=1` adds IXS1 owner redirects for deep=false.
 *
 * @param {string} protocol
 * @param {import("../network/peer.js").Peer} peer
 * @param {string} collection
 * @param {string[]} locations
 * @param {{
 *   propertyCount?: number,
 *   deep?: boolean,
 *   refresh?: boolean,
 *   envelope?: boolean,
 *   via?: string | string[],
 *   routingKey?: Uint8Array,
 * }} [options]
 * @returns {Promise<{
 *   elements: any[],
 *   redirects: Array<{ location: string, name: string, ip: string, port: number }>,
 *   ingress?: { name: string, ip: string, port: number } | null,
 *   bytes?: number,
 *   rows?: number,
 *   folded?: number,
 * }>}
 */
export async function getSets(protocol, peer, collection, locations, options = {}) {
  const cleaned = Array.isArray(locations)
    ? locations.map((s) => String(s).trim()).filter(Boolean)
    : [];

  if (cleaned.length === 0) {
    return { elements: [], redirects: [], ingress: null };
  }

  const deep = options.deep !== false;
  const refresh = options.refresh === true;
  const envelope = options.envelope === true || (!deep && options.envelope !== false);
  const locationsParam = cleaned.join(",");
  let url = `${protocol}://${getHostFromIP(
    peer.ip()
  )}:${peer.port()}/sets?collection=${encodeURIComponent(
    collection
  )}&location=${encodeURIComponent(locationsParam)}&deep=${
    deep ? "true" : "false"
  }&refresh=${refresh ? "true" : "false"}`;
  if (envelope) {
    url += "&envelope=1";
  }
  if (options.via != null && options.via !== "") {
    const via =
      Array.isArray(options.via) ? options.via.filter(Boolean).join(",") : String(options.via);
    if (via) url += `&via=${encodeURIComponent(via)}`;
  }

  /** @type {Record<string, string>} */
  const extra = {};
  if (options.routingKey instanceof Uint8Array && options.routingKey.length > 0) {
    extra["X-Indexus-Routing-Key"] = encodeUrl64(options.routingKey);
  }

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: authHeaders(extra),
  });

  const ingress = ingressFromHeaders(response.headers);

  const raw = response.data;
  let u8 = null;
  if (raw instanceof ArrayBuffer) {
    u8 = raw.byteLength ? new Uint8Array(raw) : null;
  } else if (raw instanceof Uint8Array) {
    u8 = raw.byteLength ? raw : null;
  } else if (raw?.buffer instanceof ArrayBuffer) {
    const len = raw.byteLength ?? 0;
    u8 = len ? new Uint8Array(raw.buffer, raw.byteOffset ?? 0, len) : null;
  }

  if (!u8 || u8.byteLength === 0) {
    debugLog("sets", "empty payload", {
      collection,
      locations: cleaned.length,
      first: cleaned[0],
      refresh,
      envelope,
    });
    return { elements: [], redirects: [], ingress, bytes: 0, rows: 0, folded: 0 };
  }

  let redirects = [];
  let body = u8;
  const framed = decodeSetsEnvelope(u8);
  if (framed.ok) {
    redirects = framed.redirects;
    body = framed.body;
  }

  if (!body || body.byteLength === 0) {
    return { elements: [], redirects, ingress, bytes: u8.byteLength, rows: 0, folded: 0 };
  }

  const propertyCount =
    Number(options.propertyCount) > 0
      ? Math.floor(Number(options.propertyCount))
      : SETS_BINARY_PROPERTY_COUNT;

  const { blocks } = decodeSetsBinary(body, { propertyCount });
  const stats = { folded: 0 };
  const elements = binaryBlocksToElements(collection, blocks, undefined, stats);

  let rows = 0;
  for (let i = 0; i < blocks.length; i++) rows += blocks[i].size;

  if (debugEnabled("sets")) {
    debugLog("sets", "decoded", {
      collection,
      asked: cleaned.length,
      first: cleaned[0],
      refresh,
      envelope,
      redirects: redirects.length,
      bytes: u8.byteLength,
      rows,
      elements: elements.length,
      folded: stats.folded,
    });
  }

  return {
    elements,
    redirects,
    ingress,
    bytes: u8.byteLength,
    rows,
    folded: stats.folded,
  };
}
