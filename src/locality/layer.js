import { Store } from "./store.js";

class Layer {
  constructor() {
    this.radius = 0;
    this.indexed = new Store();
    this.selected = new Store();
    this.loaded = new Store();
    this.final = true;
    this.waiting = 0;
    this.target = 0;
  }
}

export { Layer };
