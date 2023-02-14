/* eslint-disable n/no-process-exit */
import inquirer from 'inquirer';

import { writeChangeset } from './changesets.js';
import { formatMessage, selectMerges } from './select-merges.js';

/**
 * @param {import('./types.js').GroupedChange[]} changes
 * @param {string} [ cwd ] defaults to process.cwd()
 */
export async function startInteractive(changes, cwd = process.cwd()) {
  let selected = await selectMerges(changes);

  if (selected.length === 0) {
    console.info('No changes were selected');
    process.exit(0);
  }

  let formatted = selected
    .map((change) => formatMessage(change, 14))
    .map((message) => '   ' + message)
    .join('\n');

  let answers = await inquirer.prompt([
    {
      name: 'proceedToChangesets',
      type: 'confirm',
      message:
        `The following commits will have changesets created for each of them. ` +
        `If the commits have an associated Pull Request, ` +
        `the PR description will be added along with any commit messages for extra context. ` +
        `These changesets should be reviewed before commiting, they will be copied into the CHANGELOG.md upon release.` +
        `\n\n` +
        formatted +
        '\n',
    },
  ]);

  if (answers.proceedToChangesets) {
    for (let change of selected) {
      await writeChangeset(change, cwd);
    }
  }
}
