import { Peer } from "../network/peer.js";
import { getSets } from "./getSets.js";

/**
 * Compatibility alias over {@link getSets} for a single location. Prefer
 * Network.getSet / Network.getSets — both share one `/sets` engine.
 *
 * @param {string} protocol
 * @param {Peer} peer
 * @param {string} collection
 * @param {string} location
 * @param {boolean} [deep=true]
 * @returns {Promise<{ contact: Peer, set: any[] | null }>}
 */
export async function getSet(protocol, peer, collection, location, deep = true) {
  const { elements, redirects } = await getSets(protocol, peer, collection, [location], {
    deep,
    envelope: !deep,
  });

  let contact = peer;
  const redirect = redirects.find((r) => r.location === location);
  if (redirect && redirect.name && redirect.port > 0) {
    contact = new Peer(
      redirect.name,
      { [redirect.ip]: null },
      redirect.port,
      redirect.ip
    );
  }

  // deep=false miss with a redirect and no rows mirrors JSON /set's null set.
  if (!deep && elements.length === 0 && redirect) {
    return { contact, set: null };
  }

  return { contact, set: elements };
}
