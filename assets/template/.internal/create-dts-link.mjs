#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, lstatSync, unlinkSync, symlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Use the same pinned CeenJs6 declaration source as a normal npm install.
const manifest = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const specification = manifest.devDependencies.ceenjs6;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const options = { stdio: 'inherit', shell: process.platform === 'win32' };
const linkPath = join(process.cwd(), 'declarations');

try {
    try {
        const existing = lstatSync(linkPath);
        if (!existing.isSymbolicLink()) {
            throw new Error('declarations 已存在且不是软链接，请先手动备份或移走该目录');
        }
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    execFileSync(npm, ['install', '-g', specification], options);
    const globalRoot = execFileSync(npm, ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim();
    const target = join(globalRoot, 'ceenjs6', 'declarations');
    if (!existsSync(join(target, 'ceenjs6', 'index.d.ts'))) {
        throw new Error('CeenJs6 声明文件入口不存在');
    }
    try { unlinkSync(linkPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
    console.log(`CeenJs6 声明文件软链接创建成功: ${linkPath} -> ${target}`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
