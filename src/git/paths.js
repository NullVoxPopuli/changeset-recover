import { execaCommand } from 'execa';

async function gitRoot() {
  let { stdout } = await execaCommand(`git rev-parse --show-toplevel`);

  return stdout;
}

