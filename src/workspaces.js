import path from 'node:path';

import { project, packageJson } from 'ember-apply';

import { filesChangedIn, getLatestTag, mergesToBranch } from './git/commits.js';

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

    PROJECTS.push({
      name: info.name,
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
  * @param {string} fromBaseReference defaults to latest tag
 */
export async function getGroupedChanges(fromBaseReference) {
  let tag = fromBaseReference || await getLatestTag();
  let commits = await mergesToBranch(tag);
  let projects = await getProjects();

  let groups = await Promise.all(
    commits.map(async (commit) => {
      let files = await filesChangedIn(commit);

      let workspaces = projects
        .filter((project) => {
          return files.some((file) =>
            file.startsWith(project.gitRootRelativePath)
          );
        })
        .map((project) => project.gitRootRelativePath);

      return { files, commit, workspaces };
    })
  );

  return groups;
}
