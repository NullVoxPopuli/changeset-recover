// subset of GitHub PR object
//  https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28
export interface PR {
  number: number;
  html_url: string;
  body: string;
  title: string;
  labels: Label[];
  closed_at: string;
}

interface Label {
  id: number;
  url: string;
  name: 'patch' | 'minor' | 'major' | string;
  color: string;
  default: boolean;
  description: string;
}

export interface GroupedChange {
  files: string[];
  commit: string;
  // PR author
  author: string;
  // detected authors from commits
  authors: string[];
  message: string;
  workspaces: Project[];
  pr?: PR;
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
