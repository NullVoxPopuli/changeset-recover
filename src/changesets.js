import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {import('./types.js').GroupedChange} change}
 */
export async function writeChangeset(change, cwd = process.cwd()) {
  let publicPackages = change.workspaces.filter((project) => !project.private);
  let filePath = path.join(
    cwd,
    '.changeset',
    `automated-from-${change.commit}.md`
  );

  let message = change.message;

  if (change.pr) {
    message = change.pr.title + '\n\n' + change.pr.body;
  }

  let text =
    `---\n` +
    `# each of these should be one of "patch", "minor", "major"\n` +
    publicPackages.map((project) => `"${project.name}": TODO\n`).join('') +
    '---\n' +
    '\n' +
    message;

  await fs.writeFile(filePath, text);
}
