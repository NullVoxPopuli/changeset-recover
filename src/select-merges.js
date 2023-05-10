import chalk from 'chalk';
import inquirer from 'inquirer';
import { TreePrompt } from 'inquirer-tree-prompt';
import wrapAnsi from 'wrap-ansi';

import { authorIs } from './git/author.js';

inquirer.registerPrompt('tree', TreePrompt);

const NO_CHANGESET = `Merges that don't have changeset entries`;
const EXISTING_CHANGESET = `Merges that already have changeset entries`;
const FROM_RENOVATE = 'From Renovate';
const FROM_DEPENDABOT = 'From Dependabot';

/**
 * @param {import('./types.js').GroupedChange[]} changes
 */
export async function selectMerges(changes) {
  let filtered = filterBots(changes);
  let treeOptions = [];
  /** @type {Record<string, { value: string; name: string; short: string; }[]>} */
  let optionsByKey = {
    [NO_CHANGESET]: await Promise.all(
      filtered.nonBots.map(changeToInquiererChoice)
    ),
    [EXISTING_CHANGESET]: [],
    [FROM_RENOVATE]: [],
    [FROM_DEPENDABOT]: [],
  };

  treeOptions.push({
    value: NO_CHANGESET,
    open: true,
    children: optionsByKey[NO_CHANGESET],
  });

  if (filtered.alreadyHasChangeset.length) {
    optionsByKey[EXISTING_CHANGESET] = await Promise.all(
      filtered.alreadyHasChangeset.map(changeToInquiererChoice)
    );
    treeOptions.push({
      value: EXISTING_CHANGESET,
      open: false,
      children: optionsByKey[EXISTING_CHANGESET],
    });
  }

  if (filtered.renovate.length) {
    optionsByKey[FROM_RENOVATE] = await Promise.all(
      filtered.renovate.map(changeToInquiererChoice)
    );

    treeOptions.push({
      value: FROM_RENOVATE,
      open: false,
      children: optionsByKey[FROM_RENOVATE],
    });
  }

  if (filtered.dependabot.length) {
    optionsByKey[FROM_DEPENDABOT] = await Promise.all(
      filtered.dependabot.map(changeToInquiererChoice)
    );
    treeOptions.push({
      value: FROM_DEPENDABOT,
      open: false,
      children: optionsByKey[FROM_DEPENDABOT],
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
    },
  ]);

  let selected = answers.commitsToMakeChangesetsFor;

  /**
   * Handle bulk / top-level tree selections
   */
  for (let [key, options] of Object.entries(optionsByKey)) {
    if (selected.includes(key)) {
      selected.push(...options.map((option) => option.value));
    }
  }

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

  let message = `${chalk.bold.yellow(
    commit
  )} | ${pr} | ${title}${sub}${workspaces}`;

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
