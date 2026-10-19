const fs = require('node:fs');
const path = require('node:path');

// Three decimal places separate CEEN revisions from the upstream patch number.
const REVISION_BASE = 1000;
function parseUpstream(version) {
    if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
        throw new Error('Upstream version must contain three numeric components, e.g. 1.0.15');
    }
    const numbers = version.split('.').map(Number);
    if (!numbers.every(Number.isSafeInteger)) throw new Error('Upstream version is too large');
    return numbers;
}
function versions(state) {
    const [major, minor, patch] = parseUpstream(state.upstreamVersion);
    if (!Number.isInteger(state.revision) || state.revision < 1 || state.revision >= REVISION_BASE) {
        throw new Error(`CEEN revision must be between 1 and ${REVISION_BASE - 1}`);
    }
    const marketplacePatch = patch * REVISION_BASE + state.revision;
    if (!Number.isSafeInteger(marketplacePatch)) throw new Error('Marketplace patch is too large');
    return {
        release: `${state.upstreamVersion}.${state.revision}`,
        marketplace: `${major}.${minor}.${marketplacePatch}`,
        upstream: state.upstreamVersion,
    };
}
function nextRelease(state, upstream = state.upstreamVersion) {
    versions(state);
    const current = parseUpstream(state.upstreamVersion);
    const target = parseUpstream(upstream);
    let order = 0;
    for (let i = 0; i < 3 && order === 0; i++) order = Math.sign(target[i] - current[i]);
    if (order < 0) throw new Error('Upstream version must not move backwards');
    const next = { upstreamVersion: upstream, revision: order > 0 ? 1 : state.revision + 1 };
    versions(next);
    return next;
}
function synchronize(directory, state, check = false) {
    const value = versions(state);
    const manifestPath = path.join(directory, 'package.json');
    const lockPath = path.join(directory, 'package-lock.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (check) {
        if (manifest.version !== value.marketplace || manifest.ceenVersion !== value.release || manifest.upstreamVersion !== value.upstream || lock.version !== value.marketplace || lock.packages[''].version !== value.marketplace) {
            throw new Error('Version files are out of sync. Run npm run release:sync after resolving upstream merges.');
        }
    } else {
        manifest.version = value.marketplace;
        manifest.ceenVersion = value.release;
        manifest.upstreamVersion = value.upstream;
        lock.version = lock.packages[''].version = value.marketplace;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');
        fs.writeFileSync(lockPath, JSON.stringify(lock, null, 4) + '\n');
        fs.writeFileSync(path.join(directory, 'ceen-version.json'), JSON.stringify(state, null, 4) + '\n');
    }
    return value;
}
if (require.main === module) {
    try {
        const directory = path.resolve(__dirname, '..');
        let state = JSON.parse(fs.readFileSync(path.join(directory, 'ceen-version.json'), 'utf8'));
        const [operation = '--check', upstream, ...extra] = process.argv.slice(2);
        if (!['--check', '--sync', '--next'].includes(operation) || extra.length || (upstream && operation !== '--next')) {
            throw new Error('Usage: release-version.cjs --check | --sync | --next [upstream-version]');
        }
        if (operation === '--next') state = nextRelease(state, upstream);
        const value = synchronize(directory, state, operation === '--check');
        console.log(`CeenJs6 ${value.release}; Marketplace ${value.marketplace}; upstream ${value.upstream}`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
module.exports = { REVISION_BASE, versions, nextRelease, synchronize };
