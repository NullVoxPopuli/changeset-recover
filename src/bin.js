#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { getChangesetList, omitTrackedChanges } from './changesets.js';
import { startInteractive } from './interactive.js';
import { getGroupedChanges } from './workspaces.js';

yargs(hideBin(process.argv))
  .command(
    ['$0'],
    'Generate changesets based on merges to the default branch',
    (yargs) => {
      return yargs
        .option('limit', {
          alias: 'l',
          type: 'number',
          description:
            'Limit the number of detected changes, useful for debugging or incrementally working with changesets',
        })
        .option('owner', {
          type: 'string',
          description: 'Set the GitHub owner of the repository to read from',
        })
        .option('non-interactive', {
          type: 'boolean',
          description:
            'skip interactive prompts -- all options will be accepted, except if opted out via config file',
        })
        .option('base', {
          alias: 'b',
          type: 'string',
          description: `The base reference to calculate changes from. By default this is the most recent tag. This can be used to backfill changes, or test out the tool before comitting to a release.`,
        })
        .option('main', {
          alias: 'm',
          type: 'string',
          description: `The main/master branch to calculate changes from. By default this is the most recent main. Legacy projects might still use master.`,
        })
        .option('path', {
          alias: 'p',
          type: 'string',
          description: `The path to the project root. By default this is the current working directory.`,
        });
    },
    async (args) => {
      let changes = await getGroupedChanges(
        args.base,
        args.main,
        args.path,
        args.limit
      );
      let changesets = await getChangesetList(args.path);
      let untrackedChanges = omitTrackedChanges(changes, changesets);

      if (untrackedChanges.length === 0) {
        console.info(
          `All detected changes (${changes.length}) have appropriate changesets`
        );

        return;
      }

      await startInteractive(untrackedChanges, args.path, args.nonInteractive);
    }
  )
  .help()
  .demandCommand().argv;
