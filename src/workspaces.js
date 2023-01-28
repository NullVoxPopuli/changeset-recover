import { project } from 'ember-apply';

/**
  * @param {string[]} commits
  * @returns {Array<{
* commit: string,
    * workspaces: string[]
    * }>}
  */
export async function changedWorkspacesFrom(commits) {
  let root = await project.workspaceRoot();
  let allWorkspaces = await project.getWorkspaces();

  let result = [];

  for (let commit of commits) {
    // TODO
  }

  return result;
}


/**
  * @returns {Array<{
    * name: string,
    * version: string,
    * absolutePath: string,
    * gitRootRelativePath: string,
    * workspaceRootRelativePath: string,
    * }>}
  */
 async function projects() {
  let allWorkspaces = await project.getWorkspaces();

 }
