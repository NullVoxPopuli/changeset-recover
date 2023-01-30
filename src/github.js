import { Octokit } from '@octokit/core';
import { execaCommand } from 'execa';

export async function getMergedPRs() {
  let octokit = new Octokit();
  let { org, repo } = await getOwner();

  if (!org || !repo) {
    return [];
  }

  let response = await octokit.request(
    `GET /repos/${org}/${repo}/pulls?` +
      'state=closed' +
      '&sort=updated' +
      '&direction=desc' +
      '&per_page=50'
  );

  return response.data;
}

/**
 * @param {string} message commit message
 */
export function extractPRNumberFromCommitMessage(message) {
  // Merge pull request #1342 from embroider-build/restore-ts-priority
  let match = /Merge pull request #(\d+) from/.exec(message);
  let numStr = match?.[1];

  return numStr ? parseInt(numStr, 10) : undefined;
}

/**
 * @returns {Promise<{ org?: string | undefined; repo?: string | undefined}>}
 */
export async function getOwner() {
  // ❯ git config --get remote.origin.url
  // git@github.com:embroider-build/embroider.git
  let { stdout } = await execaCommand('git config --get remote.origin.url');

  let match = /github\.com:(?<org>[^/]+)\/(?<repo>[^.]+)\.git/.exec(stdout);

  if (!match) return {};

  let { org, repo } = match.groups || {};

  return { org, repo };
}
