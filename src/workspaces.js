import { packageJson, project } from 'ember-apply';
import path from 'node:path';

import { authorOf } from './git/author.js';
import {
  filesChangedIn,
  getLatestTag,
  mergesToBranch,
  messageOf,
} from './git/commits.js';

/** @type {Array<import('./types.js').Project>} */
let PROJECTS;

/**
 * @returns {Promise<Array<import('./types.js').Project>>}
 */
async function getProjects() {
  if (PROJECTS) return PROJECTS;

  let [workspaces, gitRoot, packageManagerRoot] = await Promise.all([
    project.getWorkspaces(),
    project.gitRoot(),
    project.workspaceRoot(),
  ]);

  PROJECTS = [];

  for (let workspace of workspaces) {
    let info = await packageJson.read(workspace);
    let absolutePath = workspace;
    let gitRootRelativePath = path.join('.', path.relative(gitRoot, workspace));
    let packageManagerRelativePath = path.join(
      '.',
      path.relative(packageManagerRoot, workspace)
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
 */
export async function getGroupedChanges(fromBaseReference) {
  let tag = fromBaseReference || (await getLatestTag());
  let commits = await mergesToBranch(tag);
  let projects = await getProjects();

  let groups = await Promise.all(
    commits.map(async (commit) => {
      let files = await filesChangedIn(commit);

      let relevant = projects.filter((project) => {
        return files.some((file) =>
          file.startsWith(project.gitRootRelativePath)
        );
      });

      let workspaceNames = relevant.map((project) => project.name);
      let workspaces = relevant.map((project) => project.gitRootRelativePath);

      let [author, message] = await Promise.all([
        authorOf(commit),
        messageOf(commit),
      ]);

      return { files, commit, workspaces, workspaceNames, author, message };
    })
  );

  return groups;
}
