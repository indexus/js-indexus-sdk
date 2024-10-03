export async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = []; // Array to hold all the promises
  const executing = []; // Array to hold the currently executing promises

  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);

    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
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
