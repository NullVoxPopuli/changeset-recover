#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { startInteractive } from './interactive.js';
import { getGroupedChanges } from './workspaces.js';

yargs(hideBin(process.argv))
  .command(
    ['$0'],
    'Generate changesets based on merges to the default branch',
    (yargs) => {
      return yargs
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
      let changes = await getGroupedChanges(args.base, args.main, args.path);

      await startInteractive(changes, args.path);
    }
  )
  .help()
  .demandCommand().argv;
