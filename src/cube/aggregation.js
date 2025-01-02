export function aggregate(data) {
  if (!data.length) return;

  const result = [];

  let min = 0,
    max = 0;

  this.space.dimensions.forEach((dimension, i) => {
    const groups = {};

    min = max;
    max += dimension.pointLength();

    data.forEach((elm) => {
      const xyz = {
        resolution: elm.xyz.resolution,
        coordinates: elm.xyz.coordinates.slice(min, max),
      };
      const key = this.key(xyz);

      if (!groups[key]) {
        groups[key] = {
          xyz: xyz,
          bounds: elm.bounds[i],
          count: 0,
          metrics: Array(elm.metrics.length).fill(0),
        };
      }

      const group = groups[key];
      group.count += elm.count;
      elm.metrics.forEach((m, idx) => {
        group.metrics[idx] += m;
      });
    });

    result.push(groups);
  });

  return result;
}
