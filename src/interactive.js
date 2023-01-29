import inquirer from 'inquirer';

import { authorOf, isDependabot, isRenovate } from './git/author.js';
import { messageOf } from './git/commits.js';
import { inspect } from './util.js';

/**
 * @param {import('./types.js').GroupedChange[]} changes
 */
export async function startInteractive(changes) {
  let choices = await Promise.all(changes.map(async change => {
    return {
      value: change.commit,
      name: await formatMessage(change),
    }
  }));

  let answers = await inquirer
    .prompt([
      {
        name: 'commitsToMakeChangesetsFor',
        message: 'Which merges would you like to create changesets for?',
        type: 'checkbox',
        pageSize: 20,
        choices, 
      }
    ])

  inspect(answers)
}

/**
  * @param {import('./types.js').GroupedChange} groupedChange
  */
async function formatMessage(groupedChange) {
  let commit = commitAbbr(groupedChange.commit)
  let summary = await messageOf(groupedChange.commit); 
  let indent = '   '; // 3 spaces
  let offset = '           '; // 8 spaces + 3 separator characters
  let startNewLine = `\n${indent}${offset}`;

  let message = `${commit} | ${await authorOf(groupedChange.commit)}`;

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
      return groupedChange.files.some(file => {
        return file.startsWith('.changeset') && file.endsWith('.md') && !file.includes('README.md');
      })

}

