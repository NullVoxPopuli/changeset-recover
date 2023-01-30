import { execaCommand } from 'execa';

/**
 * @param {string} commitSha
 */
export async function isRenovate(commitSha) {
  let author = await authorOf(commitSha);

  return authorIs.renovate(author);
}

/**
 * @param {string} commitSha
 */
export async function isDependabot(commitSha) {
  let author = await authorOf(commitSha);

  return authorIs.dependabot(author);
}

/**
 * @param {string} commitSha
 */
export async function authorOf(commitSha) {
  let { stdout: author } = await execaCommand(
    `git show -s --format='%an' ${commitSha}`
  );

  return author.replace(/'/g, '');
}

export const authorIs = {
  /**
   * @param {string} authorName
   */
  renovate: (authorName) => authorName.startsWith('renovate[bot]'),
  /**
   * @param {string} authorName
   */
  dependabot: (authorName) => authorName.startsWith('dependabot[bot]'),
};
