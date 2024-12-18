// throttler.js

class Throttler {
  /**
   * Initializes the NetworkThrottler with a specified concurrency limit.
   * @param {number} poolLimit - The maximum number of concurrent network calls.
   */
  constructor(poolLimit) {
    this.poolLimit = poolLimit; // Maximum concurrent requests
    this.activeCount = 0; // Currently active requests
    this.queue = []; // Queue to hold pending requests
  }

  /**
   * Enqueues a network call to be executed under the pool's constraints.
   * @param {Function} taskFn - The network call function that returns a Promise.
   * @returns {Promise} - A Promise that resolves with the result of the network call.
   */
  enqueue(taskFn) {
    return new Promise((resolve, reject) => {
      const executeTask = async () => {
        this.activeCount++;
        try {
          const result = await taskFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeCount--;
          if (this.queue.length > 0) {
            const nextTask = this.queue.shift();
            nextTask();
          }
        }
      };

      if (this.activeCount < this.poolLimit) {
        executeTask();
      } else {
        this.queue.push(executeTask);
      }
    });
  }

  /**
   * Clears all pending tasks in the queue.
   */
  clearQueue() {
    this.queue = [];
  }

  /**
   * Returns the number of active and queued tasks.
   * @returns {Object} - An object containing active and queued counts.
   */
  getStatus() {
    return {
      active: this.activeCount,
      queued: this.queue.length,
    };
  }
}

export { Throttler };
