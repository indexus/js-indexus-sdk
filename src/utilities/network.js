export async function asyncPool(poolLimit, array, iteratorFn) {
  if (!Array.isArray(array) || array.length === 0) return [];

  const limit = Math.max(1, Math.floor(Number(poolLimit) || 1));
  if (limit >= array.length) {
    return Promise.all(array.map((item) => iteratorFn(item)));
  }

  const ret = [];
  const executing = [];

  for (let i = 0; i < array.length; i++) {
    const p = Promise.resolve(iteratorFn(array[i]));
    ret.push(p);

    const e = p.then(() => {
      const index = executing.indexOf(e);
      if (index >= 0) executing.splice(index, 1);
    });
    executing.push(e);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(ret);
}

export function getHostFromIP(ip) {
  let host;
  if (ip.includes(":")) {
    host = `[${ip}]`;
  } else {
    host = ip;
  }
  return host;
}
