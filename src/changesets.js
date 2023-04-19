import fse from 'fs-extra';
import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const FILE_PREFIX = 'automated-from';

/**
 * @param {import('./types.js').GroupedChange} change}
 */
export async function writeChangeset(change, cwd = process.cwd()) {
  let publicPackages = change.workspaces.filter((project) => !project.private);
  let filePath = path.join(
    cwd,
    '.changeset',
    `${FILE_PREFIX}-${change.commit}.md`
  );

  let message = change.message;
  let prText;

  if (change.pr) {
    // GitHub makes these links for us automatically
    let authorLinks = new Set(
      change.authors.map((authorLogin) => `@${authorLogin}`)
    );

    message = change.pr.title + '\n\n' + change.pr.body;
    prText =
      `[#${change.pr.number}](${change.pr.html_url}` +
      ` : ${change.pr.title}` +
      ` : _by ${[...authorLinks.values()].join(', ')}_`;
  }

  let text =
    `---\n` +
      `# Change from: ${change.commit}\n` +
      `# each of these should be one of "patch", "minor", "major"\n` +
      publicPackages.map((project) => `"${project.name}": TODO\n`).join('') +
      '---\n' +
      '\n' +
      prText || message;

  await fs.writeFile(filePath, text);
}

/**
 * There are two ways in which a we can tie a changeset entry
 * to a commit:
 *  1. if the commit that added the file is from this automated tool
 *     -> likely: multiple other changeset entries are included in the commit
 *  2. the commit that includes the changeset is contained within the set of commits from a merged PR
 *
 *  @param {string | undefined} cwd
 */
export async function getChangesetList(cwd) {
  cwd ||= process.cwd();

  let paths = await globby(['.changeset/*.md', '!.changeset/README.md'], {
    cwd,
  });

  return paths;
}

/**
 * @param {import('./types.js').GroupedChange[]} changes;
 * @param {string[]} changesets
 */
export function omitTrackedChanges(changes, changesets) {
  let loggedCommits = changesets
    .map((filePath) => filePath.replace(`.changeset/${FILE_PREFIX}-`, ''))
    .map((filePath) => filePath.replace(`.md`, ''));

  /** @type { (commit: string) => boolean } */
  let hasCommit = (commit) => {
    return loggedCommits.some((logged) => logged === commit);
  };

  return changes.filter((change) => !hasCommit(change.commit));
}

/**
 * @param {import('./types.js').GroupedChange[]} changes;
 * @param {string} [cwd]
 */
export async function omitIgnoredChanges(changes, cwd = process.cwd()) {
  if (changes.length === 0) {
    return changes;
  }

  let ignoreFile = path.join(cwd, '.changeset', '.recoverignore');
  let ignoreExists = await fse.pathExists(ignoreFile);

  if (!ignoreExists) {
    console.debug(
      `.changeset/.recoverignore file not found, all ${changes.length} changes included`
    );

    return changes;
  }

  let file = await fs.readFile(ignoreFile);
  let fileContents = file.toString();
  let lines = fileContents.split('\n').map((line) => line.trim());

  let ignoredCommits = new Set(lines);
  /** @type { (commit: string) => boolean } */
  let isIgnored = (commit) => ignoredCommits.has(commit);

  return changes.filter((change) => !isIgnored(change.commit));
}
