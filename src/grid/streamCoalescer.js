export function createStreamCoalescer({ minBatch, flushMs, applyBatch }) {
  let buffer = [];
  let timer = null;

  function flush() {
    timer = null;
    if (buffer.length === 0) return;
    const payload = buffer;
    buffer = [];
    applyBatch(payload);
  }

  return {
    enqueue(elements) {
      if (!Array.isArray(elements) || elements.length === 0) return;

      for (let i = 0; i < elements.length; i++) {
        buffer.push(elements[i]);
      }

      if (buffer.length >= minBatch) {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        flush();
        return;
      }

      if (timer === null) {
        timer = setTimeout(flush, flushMs);
      }
    },

    flushNow() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
    },
  };
}
