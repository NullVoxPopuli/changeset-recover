import { Octokit } from '@octokit/core';
import { execaCommand } from 'execa';

let octokit = new Octokit({ auth: process.env['GITHUB_TOKEN'] });

export async function getMergedPRs(cwd = process.cwd(), owner = null) {
  let { org, repo } = await getOwner(cwd);

  if (!org || !repo) {
    return [];
  }

  if (owner) {
    org = owner;
  }

  let response = await octokit.request(
    `GET /repos/${org}/${repo}/pulls?` +
      'state=closed' +
      '&sort=updated' +
      '&direction=desc' +
      '&per_page=200'
  );

  return response.data;
}

/**
 * @param {import('./types.js').PR} pr
 */
export async function getCommits(pr, owner = null, cwd = process.cwd()) {
  let { org, repo } = await getOwner(cwd);

  if (!org || !repo) {
    return [];
  }

  if (owner) {
    org = owner;
  }

  let response = await octokit.request(
    `GET /repos/${org}/${repo}/pulls/${pr.number}/commits`
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
 * @param {string} cwd current working directory, defaults to process.cwd()
 * @returns {Promise<{ org?: string | undefined; repo?: string | undefined}>}
 */
export async function getOwner(cwd = process.cwd()) {
  // ❯ git config --get remote.origin.url
  // git@github.com:embroider-build/embroider.git
  let { stdout } = await execaCommand('git config --get remote.origin.url', {
    cwd,
  });

  let match = /github\.com:(?<org>[^/]+)\/(?<repo>[^.]+)\.git/.exec(stdout);

  if (!match) return {};

  let { org, repo } = match.groups || {};

  return { org, repo };
}
