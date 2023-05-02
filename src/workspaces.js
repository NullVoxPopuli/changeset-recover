import { packageJson, project } from 'ember-apply';
import path from 'node:path';

import { authorOf } from './git/author.js';
import {
    commitsForMerge,
    commitsSince,
  filesChangedIn,
  getLatestTag,
  mergesToBranch,
  messageOf,
} from './git/commits.js';
import {
  extractPRNumberFromCommitMessage,
  getCommits,
  getMergedPRs,
} from './github.js';

/** @type {Array<import('./types.js').Project>} */
let PROJECTS;

/**
 * @returns {Promise<Array<import('./types.js').Project>>}
 */
async function getProjects(cwd = process.cwd()) {
  if (PROJECTS) return PROJECTS;

  let [workspaces, gitRoot, packageManagerRoot] = await Promise.all([
    project.getWorkspaces(cwd),
    project.gitRoot(cwd),
    project.workspaceRoot(cwd),
  ]);

  PROJECTS = [];

  for (let workspace of workspaces) {
    let info = await packageJson.read(workspace);
    let absolutePath = workspace;
    let gitRootRelativePath = path.relative(gitRoot, workspace);
    let packageManagerRelativePath = path.relative(
      packageManagerRoot,
      workspace
    );

    let name = info.name;

    if (!name) {
      name =
        packageManagerRoot === workspace ? '[unnamed root]' : '[unknown name]';
    }

    PROJECTS.push({
      name,
      version: info.version,
      private: info.private ?? false,
      absolutePath,
      gitRootRelativePath,
      packageManagerRelativePath,
    });
  }

  return PROJECTS;
}

/**
 * Returns the list of changes for each commit since the latest tag
 *
 * @typedef {object} GetGroupedChangesOptions
 * @property {string} [ fromBaseReference ] defaults to latest tag
 * @property {string} [ branch ] defaults to 'main'
 * @property {string} [ cwd ] defaults to process.cwd()
 * @property {number} [ limit ]
 * @property {string} [ owner ]
 * @property{boolean} [onlyPRs]
 *
 * @param {GetGroupedChangesOptions} options
 */
export async function getGroupedChanges(options) {
  let fromBaseReference = options.fromBaseReference;
  let branch = options.branch ?? 'main';
  let cwd = options.cwd ?? process.cwd();
  let limit = options.limit ?? Infinity;
  let owner = options.owner;
  let onlyPRs = options.onlyPRs ?? false;

  let tag = fromBaseReference || (await getLatestTag(cwd));

  console.debug('Calculating changes for ref: ' + tag);

  let prs = await getMergedPRs(cwd, owner);

  let commitGroups = await getGroupedCommits({
    cwd,
    branch,
    sinceTag: tag,
  });

  let projects = await getProjects(cwd);

  if (limit !== Infinity) {
    commitGroups = commitGroups.slice(0, limit);
  }

  let groups = await Promise.all(
    commitGroups.map(async (commitGroup) => {
      let commit = commitGroup.sha;

      let files = await filesChangedIn(commit, cwd);

      let workspaces = projects.filter((project) => {
        return files.some((file) =>
          file.startsWith(project.gitRootRelativePath)
        );
      });

      let [author, message] = await Promise.all([
        authorOf(commit, cwd),
        messageOf(commit, cwd),
      ]);

      let expectedNumber = extractPRNumberFromCommitMessage(message);
      let pr;
      let authors = [];

      if (expectedNumber) {
        pr = prs.find((pr) => pr.number === expectedNumber);

        if (pr) {
          let prCommits = await getCommits(pr, owner, cwd);

          authors = prCommits.map((commit) => commit.author.login);
        } else if (onlyPRs) {
          return;
        }
      } else if (onlyPRs) {
        return;
      }

      return { files, commit, workspaces, author, message, pr, authors };
    })
  );

  return groups.filter(Boolean);
}

/**
  * For a given set of commits (and merge commits), 
  * this function will group them together so that we can iterate over them
  * such that we don't iterate over commits that are included in merges.
  *
  * @typedef {object} GroupedCommit 
  * @property {string} sha
  * @property {boolean} isMerge
  * @property {string[]} childCommits
  *
  * @typedef {object} GroupedOptions 
  * @property {string} branch
  * @property {string} cwd
  * @property {string} sinceTag
  *
  * @param {GroupedOptions} options
  *
  * @returns {Promise<GroupedCommit[]>}
  */
async function getGroupedCommits(options) {
  let result = [];

  let { cwd, branch, sinceTag } = options;

  let commits = await commitsSince(sinceTag, branch, cwd);
  let mergeCommits = await mergesToBranch(sinceTag, branch, cwd);

  let seenCommits = new Set();

  for (let commit of mergeCommits) {
    let childCommits = await commitsForMerge(commit, cwd);

    /** @type {GroupedCommit} */ 
    let groupedCommit = {
      isMerge: true,
      sha: commit,
      childCommits,
    }

    seenCommits.add(commit);
    childCommits.forEach(commit => seenCommits.add(commit));

    result.push(groupedCommit);
  }

  let unseenCommits = commits.filter(commit => {
    return !seenCommits.has(commit);
  });

  for (let commit of unseenCommits) {
    result.push({
      isMerge: false,
      sha: commit,
      childCommits: [],
    });
  }

  let areAllMerges = mergeCommits.length === result.length;

  console.debug(
     `\tMerge Commits: ${mergeCommits.length}\n` 
    + `\tAll Commits: ${commits.length}\n`
    + `\t--> ${areAllMerges ? 'all commits come from merges' : ''}`
  );

  return result;

}
