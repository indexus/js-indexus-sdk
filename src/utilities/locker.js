// locker.js
class Locker {
  constructor() {
    this.readers = 0;
    this.writer = false;
    this.readQueue = [];
    this.writeQueue = [];
  }

  async acquireRead() {
    return new Promise((resolve) => {
      if (!this.writer && this.writeQueue.length === 0) {
        this.readers++;
        resolve();
      } else {
        this.readQueue.push(resolve);
      }
    });
  }

  releaseRead() {
    this.readers--;
    this._next();
  }

  async acquireWrite() {
    return new Promise((resolve) => {
      if (!this.writer && this.readers === 0) {
        this.writer = true;
        resolve();
      } else {
        this.writeQueue.push(resolve);
      }
    });
  }

  releaseWrite() {
    this.writer = false;
    this._next();
  }

  _next() {
    if (this.writeQueue.length > 0 && this.readers === 0 && !this.writer) {
      this.writer = true;
      const resolve = this.writeQueue.shift();
      resolve();
    } else {
      while (
        this.readQueue.length > 0 &&
        !this.writer &&
        this.writeQueue.length === 0
      ) {
        this.readers++;
        const resolve = this.readQueue.shift();
        resolve();
      }
    }
  }
}

export { Locker };
