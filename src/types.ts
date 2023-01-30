export interface GroupedChange {
  files: string[];
  commit: string;
  author: string;
  message: string;
  workspaces: Project[];
  // subset of GitHub PR object
  //  https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28
  pr?: {
    number: number;
    body: string;
    title: string;
    closed_at: string;
  };
}

export interface Project {
  /**
   * package.json#name
   */
  name: string;
  /**
   * package.json#version
   */
  version: string;
  /**
   * package.json#private
   */
  private: boolean;
  /**
   * absolute path to the project on the file system
   */
  absolutePath: string;
  /**
   * path to the project relative to the git root
   */
  gitRootRelativePath: string;
  /**
   * path to the project relative to the package-manager root
   */
  packageManagerRelativePath: string;
}
