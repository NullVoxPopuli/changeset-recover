#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

import { project } from 'ember-apply';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getLatestTag, mergesToBranch } from './git.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

yargs(hideBin(process.argv))
  .command(
    ['$0'],
    'Generate changesets based on merges to the default branch',
    () => {},
    async () => {
      let tag = await getLatestTag();
      let merges = await mergesToBranch(tag);
      let workspaces = await project.getWorkspaces();

      console.log({ merges, workspaces });
      // TODO:
      // await workspaceChangesPerCommit
      //
      // 2. Iterate over each commit and prompt if there is an existing changeset 
      //    for the set of changes

      console.log({ merges });
    }
  )
  .help()
  .demandCommand().argv;

