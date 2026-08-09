export function createArrayPool(maxIdle = 8) {
  const pool = [];
  const limit = Number.isFinite(maxIdle) ? Math.max(1, Math.floor(maxIdle)) : 8;

  return {
    acquire() {
      return pool.pop() || [];
    },

    release(array) {
      if (!Array.isArray(array)) return;
      array.length = 0;
      if (pool.length < limit) {
        pool.push(array);
      }
    },
  };
}

export function createSetPool(maxIdle = 8) {
  const pool = [];
  const limit = Number.isFinite(maxIdle) ? Math.max(1, Math.floor(maxIdle)) : 8;

  return {
    acquire() {
      return pool.pop() || new Set();
    },

    release(set) {
      if (!(set instanceof Set)) return;
      set.clear();
      if (pool.length < limit) {
        pool.push(set);
      }
    },
  };
}
