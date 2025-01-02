// throttler.js

class Throttler {
  /**
   * Initializes the Throttler with a specified concurrency limit.
   * @param {number} poolLimit - The maximum number of concurrent network calls.
   */
  constructor(poolLimit) {
    this.poolLimit = poolLimit; // Maximum concurrent requests
    this.activeCount = 0; // Currently active requests
    this.queue = []; // Queue to hold pending tasks
    this.taskMap = new Map(); // Map to track tasks by their unique keys
  }

  /**
   * Enqueues a network call to be executed under the pool's constraints.
   * If a task with the same key is already active or queued, returns the existing promise.
   * @param {string} key - A unique identifier for the task.
   * @param {Function} taskFn - The network call function that returns a Promise.
   * @returns {Promise} - A Promise that resolves with the result of the network call.
   */
  enqueue(key, taskFn) {
    if (this.taskMap.has(key)) {
      // If the task is already in progress or queued, return the existing promise
      return this.taskMap.get(key);
    }

    const taskPromise = new Promise((resolve, reject) => {
      const executeTask = async () => {
        this.activeCount++;
        try {
          const result = await taskFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeCount--;
          this.taskMap.delete(key); // Remove the task from the map upon completion
          if (this.queue.length > 0) {
            const nextTask = this.queue.shift();
            nextTask();
          }
        }
      };

      if (this.activeCount < this.poolLimit) {
        executeTask();
      } else {
        // If the pool is full, queue the task
        this.queue.push(executeTask);
      }
    });

    // Store the promise in the map to prevent duplicate tasks
    this.taskMap.set(key, taskPromise);
    return taskPromise;
  }

  /**
   * Clears all pending tasks in the queue.
   */
  clearQueue() {
    // Optionally, you can also reject all pending promises here
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
