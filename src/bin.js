#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { inspect } from './util.js';
import { getGroupedChanges } from './workspaces.js';

yargs(hideBin(process.argv))
  .command(
    ['$0'],
    'Generate changesets based on merges to the default branch',
    (yargs) => {
      yargs.option('base', {
        alias: 'b',
        type: 'string',
        description: `The base reference to calculate changes from. By default this is the most recent tag. This can be used to backfill changes, or test out the tool before comitting to a release.`
      })
    },
    async (args) => {
      let changes = await getGroupedChanges(args.base);

      inspect(changes);
      // TODO:
      // await workspaceChangesPerCommit
      //
      // 2. Iterate over each commit and prompt if there is an existing changeset
      //    for the set of changes
    }
  )
  .help()
  .demandCommand().argv;
