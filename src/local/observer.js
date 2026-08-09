import { Item, Monitoring, State } from "../model/index.js";

export async function getSet(set, addSet) {
  if (set instanceof Item) {
    addSet(set);
    this.monitoring.send(new Monitoring(this.level + 1, State.Indexed, set));
    return;
  }

  const space = this.spaces[set.collection()];
  const elements = await this.network.getSet(set.collection(), set.hash());

  for (const element of elements) {
    if (!this.addLocation(space, element)) {
      this.monitoring.send(
        new Monitoring(this.level + 1, State.Filtered, element)
      );
      continue;
    }

    addSet(element);
    this.monitoring.send(
      new Monitoring(this.level + 1, State.Indexed, element)
    );
  }
}

export function addLocation(space, element) {
  const location = [];
  const distances = [];
  const directions = [];
  let overall = 0;
  let active = true;

  const segments = space.decode(element.hash());

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    location.push(segment);

    const dimension = space.dimension(i);
    const origin = this.options.origins[dimension.name()];
    const filter = this.options.filters[dimension.name()];

    const distance = dimension.segmentDistance(origin, segment);
    distances.push(distance);

    const direction = dimension.segmentDirection(origin, segment);
    directions.push(direction);

    overall += distance / dimension.ratio() / segments.length;

    active =
      active &&
      dimension.filterDirection(filter, direction) &&
      dimension.filterDistance(filter, distance);
  }

  element.locate(location, distances, directions, overall);

  return active;
}
