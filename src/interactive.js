import inquirer from 'inquirer';

import { inspect } from './util.js';

/**
 * @param {import('./types.js').GroupedChange[]} changes
 */
export async function startInteractive(changes) {
  let options = changes.map(change => {
    return {
      abbr: change.commit.slice(0, 8),
      hasChangeset: change.files.some(file => {
        return file.startsWith('.changeset') && file.endsWith('.md') && !file.includes('README.md');
      })
    }
  });

  let answers = await inquirer
    .prompt([
      {
        name: 'commitsToMakeChangesetsFor',
        message: 'Which merges would you like to create changesets for?',
        type: 'checkbox',
        choices: options.map(c => {
          let result = `${c.abbr}`;

          if (c.hasChangeset) {
            result += ` | hasChangeset`;
          }

          return result;
        }),
      }
      /* Pass your questions in here */
    ])

  inspect(answers)
}
