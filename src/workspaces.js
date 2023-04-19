import { packageJson, project } from 'ember-apply';
import path from 'node:path';

import { authorOf } from './git/author.js';
import {
  filesChangedIn,
  getLatestTag,
  mergesToBranch,
  messageOf,
} from './git/commits.js';
import { extractPRNumberFromCommitMessage, getCommits, getMergedPRs } from './github.js';

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
 * @param {string} [ fromBaseReference ] defaults to latest tag
 * @param {string} [ branch ] defaults to 'main'
 * @param {string} [ cwd ] defaults to process.cwd()
 */
export async function getGroupedChanges(
  fromBaseReference,
  branch = 'main',
  cwd = process.cwd(),
  limit = Infinity,
) {
  let tag = fromBaseReference || (await getLatestTag(cwd));

  console.debug('Calculating changes for ref: ' + tag);

  let prs = await getMergedPRs(cwd);
  let commits = await mergesToBranch(tag, branch, cwd);
  let projects = await getProjects(cwd);

  if (limit !== Infinity) {
    commits = commits.slice(0, limit);
  }

  let groups = await Promise.all(
    commits.map(async (commit) => {
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
          let prCommits = await getCommits(pr, cwd);

          authors = prCommits.map(commit => commit.author.login);
        }
      }

      return { files, commit, workspaces, author, message, pr, authors };
    })
  );

  return groups;
}
