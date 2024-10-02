import { Peer as BasePeer } from "../model/index.js";
import { decodeUrl64 } from "../utilities/encoding.js";

class Peer extends BasePeer {
  /**
   * Constructs a new Peer instance.
   * @param {string} hash - The unique hash or identifier of the peer.
   * @param {Object.<string, null>} ips - An object containing the peer's IP addresses.
   * @param {number} port - The port number the peer is listening on.
   * @param {string} ip - The primary IP address of the peer.
   */
  constructor(hash, ips, port, ip) {
    super();

    this._id = decodeUrl64(hash);
    this._hash = hash;
    this._ips = ips;
    this._port = port;
    this._ip = ip;
  }

  /**
   * Retrieves the hash of the peer.
   * @returns {Buffer} - The hash of the peer.
   */
  id() {
    return this._id;
  }

  /**
   * Retrieves the hash of the peer.
   * @returns {string} - The hash of the peer.
   */
  hash() {
    return this._hash;
  }

  /**
   * Retrieves the IP addresses of the peer.
   * @returns {Object.<string, null>} - An object containing the IP addresses.
   */
  ips() {
    return this._ips;
  }

  /**
   * Retrieves the port number the peer is listening on.
   * @returns {number} - The port number.
   */
  port() {
    return this._port;
  }

  /**
   * Retrieves the primary IP address of the peer.
   * @returns {string} - The primary IP address.
   */
  ip() {
    return this._ip;
  }
}

export { Peer };
