import util from 'node:util';

/**
 * @param {object} obj the data to inspect
 * @param {Partial<{
 *   depth: number;
 * }>} [options]
 */
export function inspect(obj, options = {}) {
  console.debug(util.inspect(obj, false, options.depth ?? 10, true));
}
