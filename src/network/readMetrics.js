/**
 * Rolling client-side counters for the `/sets` read path.
 * Snapshotted by Aggregate into the Metrics side tab.
 */

const LATENCY_WINDOW = 64;

export class ReadMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.startedAt = Date.now();
    /** Wire HTTP getSets calls (start). */
    this.requests = 0;
    /** getSets calls that finished ok. */
    this.responsesOk = 0;
    /** getSets calls that failed. */
    this.responsesErr = 0;
    /** Parent locations asked for on the wire (sum). */
    this.locationsRequested = 0;
    /** Locations answered from local cache (incl. refresh TTL). */
    this.cacheHits = 0;
    /** Subset of cacheHits served despite refresh=true (TTL floor). */
    this.ttlHits = 0;
    /** Callers that joined an in-flight wave instead of opening a new one. */
    this.coalescedJoins = 0;
    /** IXS1 redirects received. */
    this.redirects = 0;
    /** Redirect hops actually followed to another peer. */
    this.redirectFollows = 0;
    /** Zones whose Abelian count changed on a refresh store. */
    this.zonesUpdated = 0;
    /** Sum of |count deltas| on refresh stores. */
    this.deltaAbsSum = 0;
    /** Last non-zero zone delta (signed count). */
    this.lastDelta = 0;
    this.lastDeltaLocation = null;
    this.lastDeltaAt = 0;
    /** Reconcile passes. */
    this.reconcilePasses = 0;
    this.reconcileQuiet = 0;
    this.reconcileDirty = 0;
    this.lastRootDelta = 0;
    this.lastReconcileAt = 0;
    this.lastReconcileMs = 0;
    /** Distinct peers that served at least one getSets. */
    this.peersTouched = new Set();
    /** In-flight getSets right now. */
    this.inFlight = 0;
    /** Ring buffer of recent ok latencies (ms). */
    this._latencies = [];
    this.lastLatencyMs = 0;
    this.latencySum = 0;
    this.latencyCount = 0;
    /** Payload accounting — `/sets` answers are binary frames, not JSON. */
    this.bytesTotal = 0;
    this.bytesCount = 0;
    this.lastBytes = 0;
    this.maxBytes = 0;
    /** Compressed size, when the node answered with a Content-Length. */
    this.wireBytesTotal = 0;
    this.wireBytesCount = 0;
    /** Decoded size of the answers counted in wireBytesTotal, for the ratio. */
    this.wireDecodedTotal = 0;
    /** Decoded rows (Set/Item blocks) carried by those payloads. */
    this.rowsTotal = 0;
  }

  /**
   * @param {{
   *   cacheSize: number,
   *   cacheCapacity: number,
   *   inflightZones: number,
   *   navigation?: string,
   *   method?: string,
   *   refreshTtlMs?: number,
   * }} live
   */
  snapshot(live = {}) {
    const latencies = this._latencies.slice().sort((a, b) => a - b);
    const p50 = percentile(latencies, 0.5);
    const p95 = percentile(latencies, 0.95);
    const avg =
      this.latencyCount > 0 ? this.latencySum / this.latencyCount : 0;
    const dupRatio =
      this.requests + this.coalescedJoins > 0
        ? this.coalescedJoins / (this.requests + this.coalescedJoins)
        : 0;
    const hitRatio =
      this.locationsRequested + this.cacheHits > 0
        ? this.cacheHits / (this.locationsRequested + this.cacheHits)
        : 0;

    return {
      startedAt: this.startedAt,
      uptimeMs: Date.now() - this.startedAt,
      cacheSize: live.cacheSize ?? 0,
      cacheCapacity: live.cacheCapacity ?? 0,
      inflightZones: live.inflightZones ?? 0,
      inFlight: this.inFlight,
      navigation: live.navigation ?? null,
      method: live.method ?? null,
      refreshTtlMs: live.refreshTtlMs ?? null,
      requests: this.requests,
      responsesOk: this.responsesOk,
      responsesErr: this.responsesErr,
      locationsRequested: this.locationsRequested,
      cacheHits: this.cacheHits,
      ttlHits: this.ttlHits,
      coalescedJoins: this.coalescedJoins,
      dupRatio,
      hitRatio,
      redirects: this.redirects,
      redirectFollows: this.redirectFollows,
      zonesUpdated: this.zonesUpdated,
      deltaAbsSum: this.deltaAbsSum,
      lastDelta: this.lastDelta,
      lastDeltaLocation: this.lastDeltaLocation,
      lastDeltaAt: this.lastDeltaAt,
      reconcilePasses: this.reconcilePasses,
      reconcileQuiet: this.reconcileQuiet,
      reconcileDirty: this.reconcileDirty,
      lastRootDelta: this.lastRootDelta,
      lastReconcileAt: this.lastReconcileAt,
      lastReconcileMs: this.lastReconcileMs,
      peersTouched: this.peersTouched.size,
      lastLatencyMs: this.lastLatencyMs,
      latencyAvgMs: avg,
      latencyP50Ms: p50,
      latencyP95Ms: p95,
      bytesTotal: this.bytesTotal,
      bytesAvg: this.bytesCount > 0 ? this.bytesTotal / this.bytesCount : 0,
      bytesMax: this.maxBytes,
      lastBytes: this.lastBytes,
      wireBytesTotal: this.wireBytesTotal,
      wireBytesAvg:
        this.wireBytesCount > 0 ? this.wireBytesTotal / this.wireBytesCount : 0,
      compressionRatio:
        this.wireBytesTotal > 0 ? this.wireDecodedTotal / this.wireBytesTotal : 0,
      rowsTotal: this.rowsTotal,
      bytesPerRow:
        this.rowsTotal > 0 ? this.bytesTotal / this.rowsTotal : 0,
      bytesPerLocation:
        this.locationsRequested > 0
          ? this.bytesTotal / this.locationsRequested
          : 0,
      at: Date.now(),
    };
  }

  /**
   * One `/sets` answer off the wire. `bytes` is the decoded frame; `wireBytes`
   * is what the link carried, and is only known for unchunked answers.
   * @param {{ bytes?: number, wireBytes?: number, rows?: number }} payload
   */
  onPayload({ bytes = 0, wireBytes = 0, rows = 0 } = {}) {
    if (!Number.isFinite(bytes) || bytes < 0) return;
    this.bytesTotal += bytes;
    this.bytesCount += 1;
    this.lastBytes = bytes;
    if (bytes > this.maxBytes) this.maxBytes = bytes;
    if (Number.isFinite(rows) && rows > 0) this.rowsTotal += rows;
    if (Number.isFinite(wireBytes) && wireBytes > 0) {
      this.wireBytesTotal += wireBytes;
      this.wireBytesCount += 1;
      this.wireDecodedTotal += bytes;
    }
  }

  onCacheHit(count = 1, { ttl = false } = {}) {
    this.cacheHits += count;
    if (ttl) this.ttlHits += count;
  }

  onCoalescedJoin(count = 1) {
    this.coalescedJoins += count;
  }

  onRequestStart({ locations = 1, peer = null } = {}) {
    this.requests += 1;
    this.inFlight += 1;
    this.locationsRequested += Math.max(0, locations);
    if (peer) this.peersTouched.add(peer);
  }

  onRequestEnd({ ok = true, ms = 0, redirects = 0 } = {}) {
    this.inFlight = Math.max(0, this.inFlight - 1);
    if (ok) this.responsesOk += 1;
    else this.responsesErr += 1;
    if (ok && Number.isFinite(ms)) {
      this.lastLatencyMs = ms;
      this.latencySum += ms;
      this.latencyCount += 1;
      this._latencies.push(ms);
      if (this._latencies.length > LATENCY_WINDOW) this._latencies.shift();
    }
    if (Number.isFinite(redirects) && redirects > 0) {
      this.redirects += redirects;
    }
  }

  onRedirectFollow() {
    this.redirectFollows += 1;
  }

  onZoneDelta(location, delta) {
    if (!Number.isFinite(delta) || delta === 0) return;
    this.zonesUpdated += 1;
    this.deltaAbsSum += Math.abs(delta);
    this.lastDelta = delta;
    this.lastDeltaLocation = location;
    this.lastDeltaAt = Date.now();
  }

  onReconcile({ dirty = 0, rootDelta = 0, ms = 0 } = {}) {
    this.reconcilePasses += 1;
    if (dirty > 0) this.reconcileDirty += 1;
    else this.reconcileQuiet += 1;
    this.lastRootDelta = rootDelta;
    this.lastReconcileAt = Date.now();
    this.lastReconcileMs = ms;
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p * sorted.length) - 1)
  );
  return sorted[idx];
}
