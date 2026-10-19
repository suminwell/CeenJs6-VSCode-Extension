const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { synchronize } = require('./release-version.cjs');
const directory = path.resolve(__dirname, '..');
const state = require('../ceen-version.json');
const value = synchronize(directory, state, true);
const args = process.argv.slice(2);
if (!args.some(arg => arg === '-o' || arg === '--out' || arg.startsWith('--out='))) {
    args.push('--out', `ceenjs6-${value.release}.vsix`);
}
const cli = require.resolve('@vscode/vsce/vsce');
const result = spawnSync(process.execPath, [cli, 'package', ...args], { cwd: directory, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
