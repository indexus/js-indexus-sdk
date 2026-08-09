export function aggregate(data) {
  if (!data.length) return;

  const result = [];

  let min = 0,
    max = 0;
  const dimensions = this.space.dimensions;

  for (let i = 0; i < dimensions.length; i++) {
    const dimension = dimensions[i];
    const groups = {};

    min = max;
    max += dimension.pointLength();
    const coordinateCount = max - min;

    for (let j = 0; j < data.length; j++) {
      const elm = data[j];
      const sourceCoordinates = elm.xyz.coordinates;
      let key = `${elm.xyz.resolution}`;
      for (let c = 0; c < coordinateCount; c++) {
        key += `-${sourceCoordinates[min + c]}`;
      }

      if (!groups[key]) {
        const coordinates = new Array(coordinateCount);
        for (let c = 0; c < coordinateCount; c++) {
          coordinates[c] = sourceCoordinates[min + c];
        }
        const xyz = {
          resolution: elm.xyz.resolution,
          coordinates,
        };
        const metricLength = Array.isArray(elm.metrics) ? elm.metrics.length : 0;
        const metrics = new Array(metricLength);
        for (let m = 0; m < metricLength; m++) metrics[m] = 0;
        groups[key] = {
          xyz,
          bounds: elm.bounds[i],
          count: 0,
          metrics,
        };
      }

      const group = groups[key];
      group.count += elm.count;
      const metrics = elm.metrics;
      if (!Array.isArray(metrics)) continue;
      if (metrics.length > group.metrics.length) {
        const previousLength = group.metrics.length;
        group.metrics.length = metrics.length;
        for (let m = previousLength; m < metrics.length; m++) {
          group.metrics[m] = 0;
        }
      }
      for (let m = 0; m < metrics.length; m++) {
        group.metrics[m] += metrics[m];
      }
    }

    result.push(groups);
  }

  return result;
}
