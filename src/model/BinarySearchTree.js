/**
 * Represents a binary search tree (BST) data structure.
 * Each node can have a left and right child, and optionally store a value.
 */
class BinarySearchTree {
  /**
   * Constructs a new BinarySearchTree instance.
   * @param {any} node - The value or data to store at this node (optional).
   */
  constructor(node = null) {
    this.left = null;
    this.right = null;
    this.node = node;
  }

  /**
   * Inserts a node into the binary search tree based on the provided index and identifier.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} id - The identifier used to determine the placement of the node.
   * @param {any} node - The data to store at the inserted node.
   */
  insert(idx, id, node) {
    if (Math.floor(idx / 8) === id.length) {
      this.node = node;
      return;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (id[byteIndex] >> bitIndex) & 1;

    if (bit === 0) {
      if (this.left === null) {
        this.left = new BinarySearchTree();
      }
      this.left.insert(idx + 1, id, node);
    } else {
      if (this.right === null) {
        this.right = new BinarySearchTree();
      }
      this.right.insert(idx + 1, id, node);
    }
  }

  /**
   * Traverses the binary search tree and processes each node using the provided callback function.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The current value of the path taken.
   * @param {function} process - A callback function to process each leaf node.
   */
  traverse(idx, value, process) {
    if (this.left !== null) {
      const tmp = Uint8Array.from(value);
      this.left.traverse(idx + 1, tmp, process);
    }

    if (this.right !== null) {
      const tmp = Uint8Array.from(value);
      tmp[Math.floor(idx / 8)] |= 1 << (7 - (idx % 8));
      this.right.traverse(idx + 1, tmp, process);
    }

    if (idx > 0 && this.left === null && this.right === null) {
      process(idx, value, this.node);
    }
  }

  /**
   * Traverses the tree to find nodes within a certain range between owner and candidate identifiers.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} owner - The owner's identifier.
   * @param {Uint8Array} candidate - The candidate's identifier.
   * @param {Uint8Array} value - The current value of the path taken.
   * @param {function} process - A callback function to process nodes within the range.
   */
  range(idx, owner, candidate, value, process) {
    const tmp = Uint8Array.from(value);

    if (Math.floor(idx / 8) === owner.length) {
      return;
    }

    const oByteIndex = Math.floor(idx / 8);
    const oBitIndex = 7 - (idx % 8);
    const oBit = (owner[oByteIndex] >> oBitIndex) & 1;

    const cByteIndex = Math.floor(idx / 8);
    const cBitIndex = 7 - (idx % 8);
    const cBit = (candidate[cByteIndex] >> cBitIndex) & 1;

    if (oBit !== cBit) {
      if (!cBit && this.left !== null) {
        this.left.traverse(idx + 1, tmp, process);
      } else if (cBit && this.right !== null) {
        tmp[Math.floor(idx / 8)] |= 1 << (7 - (idx % 8));
        this.right.traverse(idx + 1, tmp, process);
      }
      return;
    }

    if (this.left !== null && (!oBit || this.right === null)) {
      this.left.range(idx + 1, owner, candidate, tmp, process);
    }
    if (this.right !== null && (oBit || this.left === null)) {
      tmp[Math.floor(idx / 8)] |= 1 << (7 - (idx % 8));
      this.right.range(idx + 1, owner, candidate, tmp, process);
    }
  }

  /**
   * Truncates the tree branches that do not match the owner's identifier.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} owner - The owner's identifier.
   * @param {Uint8Array} branch - The branch identifier to compare.
   */
  truncate(idx, owner, branch) {
    if (Math.floor(idx / 8) === owner.length) {
      return;
    }

    const oByteIndex = Math.floor(idx / 8);
    const oBitIndex = 7 - (idx % 8);
    const oBit = (owner[oByteIndex] >> oBitIndex) & 1;

    const bByteIndex = Math.floor(idx / 8);
    const bBitIndex = 7 - (idx % 8);
    const bBit = (branch[bByteIndex] >> bBitIndex) & 1;

    if (oBit !== bBit) {
      if (bBit && this.right !== null) {
        this.right = null;
      } else if (!bBit && this.left !== null) {
        this.left = null;
      }
      return;
    }

    if (this.left !== null && (!oBit || this.right === null)) {
      this.left.truncate(idx + 1, owner, branch);
    }
    if (this.right !== null && (oBit || this.left === null)) {
      this.right.truncate(idx + 1, owner, branch);
    }
  }

  /**
   * Retrieves a node from the tree based on the provided value.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree.
   * @returns {[any, boolean]} - A tuple containing the node data and a boolean indicating if it was found.
   */
  get(idx, value) {
    if (Math.floor(idx / 8) === value.length) {
      return [this.node, true];
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (value[byteIndex] >> bitIndex) & 1;

    if (this.left !== null && bit === 0) {
      return this.left.get(idx + 1, value);
    } else if (this.right !== null && bit === 1) {
      return this.right.get(idx + 1, value);
    }

    return [null, false];
  }

  /**
   * Finds the nearest node to the given value in the tree.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree.
   * @returns {any} - The data stored at the nearest node.
   */
  nearest(idx, value) {
    if (Math.floor(idx / 8) === value.length) {
      return this.node;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (value[byteIndex] >> bitIndex) & 1;

    if (this.left !== null && (!bit || this.right === null)) {
      return this.left.nearest(idx + 1, value);
    } else if (this.right !== null) {
      return this.right.nearest(idx + 1, value);
    }

    return this.node;
  }

  /**
   * Removes a node from the tree based on the provided value.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree for removal.
   * @returns {boolean} - Returns true if the node should be removed, otherwise false.
   */
  remove(idx, value) {
    // Base case: If we've reached the end of the value, indicate that this node should be removed.
    if (Math.floor(idx / 8) === value.length) {
      return true;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = ((value[byteIndex] >> bitIndex) & 1) === 1;

    if (!bit && this.left !== null) {
      // Attempt to remove from the left subtree.
      if (this.left.remove(idx + 1, value)) {
        // If the left child should be removed, set it to null.
        this.left = null;
        // Return true if there are no right children, indicating this node can also be removed.
        return this.right === null;
      }
    } else if (bit && this.right !== null) {
      // Attempt to remove from the right subtree.
      if (this.right.remove(idx + 1, value)) {
        // If the right child should be removed, set it to null.
        this.right = null;
        // Return true if there are no left children, indicating this node can also be removed.
        return this.left === null;
      }
    }

    // If the node was not removed, return false.
    return false;
  }

  /**
   * Extracts routing information from the tree based on the given value.
   * @param {number} idx - The current bit index being evaluated.
   * @param {Uint8Array} value - The value used to traverse the tree.
   * @param {Object} routing - An object to store routing information.
   */
  extract(idx, value, routing) {
    if (Math.floor(idx / 8) === value.length) {
      return;
    }

    const byteIndex = Math.floor(idx / 8);
    const bitIndex = 7 - (idx % 8);
    const bit = (value[byteIndex] >> bitIndex) & 1;

    if (this.left !== null && bit === 0) {
      this.left.extract(idx + 1, value, routing);
    } else if (this.right !== null && bit === 1) {
      this.right.extract(idx + 1, value, routing);
    }

    if (this.left !== null && bit === 1) {
      routing[idx] = this.left.nearest(idx + 1, value);
    } else if (this.right !== null && bit === 0) {
      routing[idx] = this.right.nearest(idx + 1, value);
    }
  }

  /**
   * Reduces the tree by applying provided functions to junctions and leaf nodes.
   * @param {number} idx - The current bit index being evaluated.
   * @param {number} side - Indicates the side of the parent node (0 for left, 1 for right).
   * @param {function} startJunction - A callback function called when a junction is started.
   * @param {function} endJunction - A callback function called when a junction is ended.
   * @param {function} leaf - A callback function called when a leaf node is encountered.
   */
  reduce(idx, side, startJunction, endJunction, leaf) {
    const isJunction = this.left !== null && this.right !== null;
    let currentSide = side;

    if (isJunction) {
      idx++;
      startJunction(currentSide);
    }

    if (this.left !== null) {
      if (isJunction) {
        side = 0;
      }
      this.left.reduce(idx, side, startJunction, endJunction, leaf);
    }

    if (this.right !== null) {
      if (isJunction) {
        side = 1;
      }
      this.right.reduce(idx, side, startJunction, endJunction, leaf);
    }

    if (idx > 0 && this.left === null && this.right === null) {
      leaf(idx, side, this.node);
    }

    if (isJunction) {
      endJunction(currentSide);
    }
  }
}

export { BinarySearchTree };
