export function aggregate(data) {
  if (!data.length) return [];

  const numBounds = data[0]._bounds.length;
  const results = [];

  for (let i = 0; i < numBounds; i++) {
    const groups = new Map();

    data.forEach((item) => {
      const key = JSON.stringify(item._bounds[i]);

      if (!groups.has(key)) {
        groups.set(key, {
          _hash: [],
          _count: 0,
          _metrics: Array(item._metrics.length).fill(0),
          _bounds: [],
          groupBound: item._bounds[i],
        });
      }

      const group = groups.get(key);
      group._hash.push(item._hash);
      group._count += item._count;
      item._metrics.forEach((m, idx) => {
        group._metrics[idx] += m;
      });
      const otherBound = item._bounds.filter((_, idx) => idx !== i)[0];
      group._bounds.push(otherBound);
    });

    const aggregated = Array.from(groups.values()).map((g) => ({
      _hash: g._hash,
      _count: g._count,
      _metrics: g._metrics,
      _bounds: g._bounds,
      groupBound: g.groupBound,
    }));

    results.push(aggregated);
  }

  return results;
}
