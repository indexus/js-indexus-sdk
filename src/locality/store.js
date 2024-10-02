class Store {
  constructor() {
    this.list = [];
    this.count = 0;
  }

  clear() {
    this.list = [];
    this.count = 0;
  }

  add(element) {
    this.list.push(element);
    this.count += element.count();
  }

  concat(list) {
    list.forEach((element) => this.add(element));
  }

  remove(selected, count) {
    this.list = this.list.slice(selected);
    this.count -= count;
  }

  sort() {
    this.list.sort((a, b) => a.distance() - b.distance());
  }
}

export { Store };
