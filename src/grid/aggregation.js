export function aggregate(data) {
  if (!data.length) return;

  const result = [];

  let min = 0,
    max = 0;

  this.space.dimensions.forEach((dimension, i) => {
    const groups = new Map();

    min = max;
    max += dimension.pointLength();

    data.forEach((elm) => {
      const key = [
        elm.xyz.resolution,
        ...elm.xyz.coordinates.slice(min, max),
      ].join("-");

      if (!groups.has(key)) {
        groups.set(key, {
          bounds: elm.bounds[i],
          count: 0,
          metrics: Array(elm.metrics.length).fill(0),
        });
      }

      const group = groups.get(key);
      group.count += elm.count;
      elm.metrics.forEach((m, idx) => {
        group.metrics[idx] += m;
      });
    });

    const aggregated = Array.from(groups.values()).map((g) => g);

    result.push(aggregated);
  });

  return result;
}
