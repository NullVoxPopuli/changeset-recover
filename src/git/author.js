import { execaCommand } from 'execa';

/**
 * @param {string} commitSha
 * @param {string} cwd current working directory, defaults to process.cwd()
 */
export async function isRenovate(commitSha, cwd = process.cwd()) {
  let author = await authorOf(commitSha, cwd);

  return authorIs.renovate(author);
}

/**
 * @param {string} commitSha
 * @param {string} cwd current working directory, defaults to process.cwd()
 */
export async function isDependabot(commitSha, cwd = process.cwd()) {
  let author = await authorOf(commitSha, cwd);

  return authorIs.dependabot(author);
}

/**
 * @param {string} commitSha
 * @param {string} cwd current working directory, defaults to process.cwd()
 */
export async function authorOf(commitSha, cwd = process.cwd()) {
  let { stdout: author } = await execaCommand(
    `git show -s --format='%an' ${commitSha}`,
    { cwd }
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
