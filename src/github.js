import { Octokit } from '@octokit/core';
import { execaCommand } from 'execa';

let octokit = new Octokit({ auth: process.env['GITHUB_TOKEN'] });

export async function getMergedPRs(cwd = process.cwd(), owner = null) {
  let { org, repo } = await getOwner(cwd);

  if (owner) {
    console.debug(`Repo: ${org}/${repo} overridden with ${owner}/${repo}`);
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

  if (owner) {
    console.debug(`Repo: ${org}/${repo} overridden with ${owner}/${repo}`);
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
 * @returns {Promise<{ org: string; repo: string}>}
 */
export async function getOwner(cwd = process.cwd()) {
  // ❯ git config --get remote.origin.url
  // git@github.com:embroider-build/embroider.git
  let { stdout } = await execaCommand('git config --get remote.origin.url', {
    cwd,
  });

  // 3 Formats
  //   https://github.com/NullVoxPopuli/embroider
  //   https://github.com/NullVoxPopuli/embroider.git
  //   git@github.com:NullVoxPopuli/embroider.git
  let match = /github\.com(:|\/)(?<org>[^/]+)\/(?<repo>[^.]+)(\.git)?/.exec(
    stdout
  );

  if (!match) {
    throw new Error(`URL was not recognized. Received: ${stdout}`);
  }

  let { org, repo } = match.groups || {};

  if (!org || !repo) {
    throw new Error(
      `Regex failure: org (${org}) or repo (${repo}) were not detected from the URL: ${stdout}`
    );
  }

  return { org, repo };
}
