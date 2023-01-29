import inquirer from 'inquirer';

import { authorIs, isDependabot, isRenovate } from './git/author.js';
import { inspect } from './util.js';

/**
 * @param {import('./types.js').GroupedChange[]} changes
 */
export async function startInteractive(changes) {
  let filtered = filterBots(changes);
  let choices = [
    new inquirer.Separator(`Merges that don't have Changeset entries`),
  ];

  choices.push(
    ...(await Promise.all(filtered.nonBots.map(changeToInquiererChoice)))
  );

  if (filtered.alreadyHasChangeset) {
    choices.push(new inquirer.Separator('Already have Changeset entries'));
    choices.push({
      value: 'expand-existing-changesets',
      name: `${filtered.alreadyHasChangeset.length} merges that have changesets`,
    });
  }

  if (filtered.hasBots) {
    choices.push(new inquirer.Separator('From bots'));
  }

  if (filtered.renovate.length) {
    choices.push({
      value: 'expand-renovate',
      name: `${filtered.renovate.length} renovate[bot] commits`,
    });
  }

  if (filtered.dependabot.length) {
    choices.push({
      value: 'expand-dependabot',
      name: `${filtered.dependabot.length} dependabot[bot] commits`,
    });
  }

  let answers = await inquirer.prompt([
    {
      name: 'commitsToMakeChangesetsFor',
      message: 'Which merges would you like to create changesets for?',
      type: 'checkbox',
      pageSize: 20,
      choices,
    },
  ]);

  inspect(answers);
}

/**
 * @param {import('./types.js').GroupedChange} change
 */
async function changeToInquiererChoice(change) {
  return {
    value: change.commit,
    name: await formatMessage(change),
  };
}

/**
 * @param {import('./types.js').GroupedChange[]} changes
 * @returns {{
 * renovate: import('./types.js').GroupedChange[],
 * dependabot: import('./types.js').GroupedChange[],
 * alreadyHasChangeset: import('./types.js').GroupedChange[],
 * nonBots: import('./types.js').GroupedChange[],
 * hasBots: boolean
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
 */
async function formatMessage(groupedChange) {
  let commit = commitAbbr(groupedChange.commit);
  let summary = groupedChange.message;
  let indent = '   '; // 3 spaces
  let offset = '           '; // 8 spaces + 3 separator characters
  let startNewLine = `\n${indent}${offset}`;

  let message = `${commit} | ${groupedChange.author}`;

  message += `${startNewLine}${summary.split('\n')[0]}`;

  if (hasChangeset(groupedChange)) {
    message += `${startNewLine}has changeset`;
  }

  if (await isRenovate(groupedChange.commit)) {
    message += `${startNewLine}from renovate-bot`;
  }

  if (await isDependabot(groupedChange.commit)) {
    message += `${startNewLine}from dependabot`;
  }

  return message;
}

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
