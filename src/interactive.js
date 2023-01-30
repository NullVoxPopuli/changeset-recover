import inquirer from 'inquirer';

import { formatMessage, selectMerges } from './select-merges.js';
import { inspect } from './util.js';

/**
 * @param {import('./types.js').GroupedChange[]} changes
 */
export async function startInteractive(changes) {
  let selected = await selectMerges(changes);

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

  inspect({ answers });
}
