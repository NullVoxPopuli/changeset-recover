import { execaCommand } from 'execa';

export async function gitRoot() {
  let { stdout } = await execaCommand(`git rev-parse --show-toplevel`);

  return stdout;
}
