import chalk from 'chalk';
import inquirer from 'inquirer';
import { TreePrompt } from 'inquirer-tree-prompt';
import wrapAnsi from 'wrap-ansi';

import { authorIs } from './git/author.js';

inquirer.registerPrompt('tree', TreePrompt);

/**
 * @param {import('./types.js').GroupedChange[]} changes
 */
export async function selectMerges(changes) {
  let filtered = filterBots(changes);
  let treeOptions = [];

  treeOptions.push({
    value: `Merges that don't have changeset entries`,
    open: true,
    children: [
      ...(await Promise.all(filtered.nonBots.map(changeToInquiererChoice))),
    ],
  });

  if (filtered.alreadyHasChangeset.length) {
    treeOptions.push({
      value: `Merges that already have changeset entries`,
      open: false,
      children: [
        ...(await Promise.all(
          filtered.alreadyHasChangeset.map(changeToInquiererChoice)
        )),
      ],
    });
  }

  if (filtered.renovate.length) {
    treeOptions.push({
      value: 'From Renovate',
      open: false,
      children: [
        ...(await Promise.all(filtered.renovate.map(changeToInquiererChoice))),
      ],
    });
  }

  if (filtered.dependabot.length) {
    treeOptions.push({
      value: 'From Dependabot',
      open: false,
      children: [
        ...(await Promise.all(
          filtered.dependabot.map(changeToInquiererChoice)
        )),
      ],
    });
  }

  let answers = await inquirer.prompt([
    {
      name: 'commitsToMakeChangesetsFor',
      message: 'Which merges would you like to create changesets for?',
      pageSize: 100,
      type: 'tree',
      multiple: true,
      short: true,
      tree: treeOptions,
      // transformer: (_, answers) => {
      //   console.log({ answers, _ })
      //   return;
      //   return answers.map(answer => chalk.bold.yellow(answer.slice(0, 8)));
      // }
    },
  ]);

  let selected = answers.commitsToMakeChangesetsFor;

  return changes.filter((change) => selected.includes(change.commit));
}

/**
 * @param {import('./types.js').GroupedChange} change
 */
async function changeToInquiererChoice(change) {
  return {
    value: change.commit,
    name: formatMessage(change),
    short: chalk.bold.yellow(commitAbbr(change.commit)),
  };
}

/**
 * @param {import('./types.js').GroupedChange[]} changes
 * @returns {{
 *   renovate: import('./types.js').GroupedChange[],
 *   dependabot: import('./types.js').GroupedChange[],
 *   alreadyHasChangeset: import('./types.js').GroupedChange[],
 *   nonBots: import('./types.js').GroupedChange[],
 *   hasBots: boolean
 * }}
 */
function filterBots(changes) {
  let renovate = [];
  let dependabot = [];
  let nonBots = [];
  let alreadyHasChangeset = [];

  for (let change of changes) {
    if (authorIs.renovate(change.author)) {
      renovate.push(change);
      continue;
    }

    if (authorIs.dependabot(change.author)) {
      dependabot.push(change);
      continue;
    }

    if (hasChangeset(change)) {
      alreadyHasChangeset.push(change);
      continue;
    }

    nonBots.push(change);
  }

  return {
    renovate,
    dependabot,
    nonBots,
    alreadyHasChangeset,
    hasBots: Boolean(renovate.length || dependabot.length),
  };
}

/**
 * @param {import('./types.js').GroupedChange} groupedChange
 * @param {number} [indentSize]
 */
export function formatMessage(groupedChange, indentSize = 19, oneLine = true) {
  let commit = commitAbbr(groupedChange.commit);
  let summary = groupedChange.message;
  let indent = ' '.repeat(indentSize);
  let affectedWorkspaces = groupedChange.workspaces.filter(
    (project) => !project.private
  );
  let workspaces = affectedWorkspaces.length
    ? `${chalk.bold.blueBright('Affected workspaces')}: ${affectedWorkspaces
        .map((project) => chalk.white(project.name))
        .join(', ')}`
    : 'No affected public workspaces.';

  let title = '';
  let lineEnding = oneLine ? '' : '\n';

  if (groupedChange.pr) {
    title = chalk.italic(groupedChange.pr.title) + lineEnding;
  }

  let sub = oneLine ? ' | ' : chalk.dim(summary.split('\n')[0]) + lineEnding;
  let pr = `PR#${groupedChange.pr?.number}`;

  let message = `${chalk.bold.yellow(commit)} | ${pr} | ${title}${sub}${workspaces}`;

  if (!oneLine) {
    message = wrapAnsi(message, 80);

    // indent all but the first line so that we align with the pipe
    message = message
      .split('\n')
      .map((line, index) => {
        if (index === 0) return line;

        return indent + line;
      })
      .join('\n');
  }

  return message;
}

/**
 * @param {string} line
 */
// function isEmpty(line) {
//   return /^\s+$/.test(line);
// }

/**
 * @param {string} sha
 */
function commitAbbr(sha) {
  return sha.slice(0, 8);
}

/**
 * @param {import('./types.js').GroupedChange} groupedChange
 */
function hasChangeset(groupedChange) {
  return groupedChange.files.some((file) => {
    return (
      file.startsWith('.changeset') &&
      file.endsWith('.md') &&
      !file.includes('README.md')
    );
  });
}
