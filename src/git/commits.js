import { execaCommand } from 'execa';

/**
 * @param {string} mergeSha
 * @param {string} [ cwd ]
 */
export async function commitsForMerge(mergeSha, cwd = process.cwd()) {
  let { stdout: commitsWithBoundary } = await execaCommand(
    `git log ${mergeSha}^..${mergeSha} --format='%H'`,
    { cwd }
  );

  let commits = commitsWithBoundary
    .replaceAll(new RegExp(`'`, 'g'), '')
    .split('\n');

  return commits.filter((commit) => mergeSha !== commit);
}

/**
 * @param {string} sinceTag
 * @param {string} [ branch ]
 * @param {string} [ cwd ]
 */
export async function commitsSince(
  sinceTag,
  branch = 'main',
  cwd = process.cwd()
) {
  let { stdout } = await execaCommand(
    `git log ${sinceTag}..${branch} --format='%H'`,
    { cwd }
  );

  return stdout.replace(new RegExp(`'`, 'g'), '').split('\n');
}

/**
 * @param {string} sinceTag
 * @param {string} [ branch ]
 * @param {string} [ cwd ]
 */
export async function mergesToBranch(
  sinceTag,
  branch = 'main',
  cwd = process.cwd()
) {
  // https://stackoverflow.com/a/47213799/356849
  //  --first-parent
  //    skips commits from merged branches. This removes the entries where someone merged master into their branches.
  //  --merges
  //   shows only "merge commits" (commits with more than 1 parent). Omit this argument if you want to see direct commits to your main branch.
  let { stdout } = await execaCommand(
    `git log ${sinceTag}..${branch} --first-parent --format='%H'`,
    { cwd }
  );

  return stdout.replace(new RegExp(`'`, 'g'), '').split('\n');
}

/**
 * @param {string} [ cwd ]
 * @returns {Promise<string>}
 */
export async function getLatestTag(cwd = process.cwd()) {
  // Examples:
  //   ember-resources@5.6.2
  //  (same output as git tag -l)
  //
  //  Except... "latest"
  let { stdout: tag } = await execaCommand(`git describe --tags --abbrev=0`, {
    cwd,
  });

  return tag;
}

/**
 * @param {string} mergeSha
 * @param {string} [ cwd ]
 * @returns {Promise<string[]>} repo-relative file paths that were changed in the merge-commit
 */
export async function filesChangedIn(mergeSha, cwd = process.cwd()) {
  // --pretty=
  //   is a git-hack to remove all the commit details because in this case we only care about the files
  let { stdout } = await execaCommand(
    `git log -m -1 --name-only --pretty= ${mergeSha}`,
    { cwd }
  );

  return stdout.split('\n');
}

/**
 * @param {string} sha
 * @param {string} [ cwd ]
 * @returns {Promise<string>}
 */
export async function messageOf(sha, cwd = process.cwd()) {
  let { stdout } = await execaCommand(`git log --format=%B -n 1 ${sha}`, {
    cwd,
  });

  return stdout;
}
