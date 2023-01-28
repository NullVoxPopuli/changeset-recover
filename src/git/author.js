import { execaCommand } from 'execa';

/**
 * @param {string} commitSha
 */
export async function isRenovate(commitSha) {
  let author = await authorOf(commitSha);

  return author.startsWith('renovate[bot]');
}

/**
 * @param {string} commitSha
 */
export async function isDependabot(commitSha) {
  let author = await authorOf(commitSha);

  return author.startsWith('dependabot[bot]');
}

/**
 * @param {string} commitSha
 */
export async function authorOf(commitSha) {
  let { stdout: author } = await execaCommand(
    `git show -s --format='%an' ${commitSha}`
  );

  return author;
}
