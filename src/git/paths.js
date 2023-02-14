import { execaCommand } from 'execa';

/**
 * @param {string} cwd current working directory, defaults to process.cwd()
 * @returns {Promise<string>}
 */
export async function gitRoot(cwd = process.cwd()) {
  let { stdout } = await execaCommand(`git rev-parse --show-toplevel`, { cwd });

  return stdout;
}
