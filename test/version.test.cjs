const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const semver = require('semver');
const { validateVersion } = require('@vscode/vsce/out/validation');
const { versions, nextRelease, synchronize } = require('../tools/release-version.cjs');

test('four-part release numbers map to valid Marketplace versions with three revision digits', () => {
    assert.deepEqual(versions({ upstreamVersion: '1.0.14', revision: 1 }), { release: '1.0.14.1', marketplace: '1.0.14001', upstream: '1.0.14' });
    assert.deepEqual(versions({ upstreamVersion: '1.0.15', revision: 1 }), { release: '1.0.15.1', marketplace: '1.0.15001', upstream: '1.0.15' });
    assert.equal(validateVersion('1.0.14001'), '1.0.14001');
    assert.throws(() => validateVersion('1.0.14.1'), /Invalid extension/);
    assert.ok(semver.gt('1.0.14001', '1.0.14'));
});

test('same upstream increments revision and a newer upstream resets it to one', () => {
    const current = { upstreamVersion: '1.0.14', revision: 87 };
    assert.deepEqual(nextRelease(current), { upstreamVersion: '1.0.14', revision: 88 });
    assert.deepEqual(nextRelease(current, '1.0.14'), { upstreamVersion: '1.0.14', revision: 88 });
    const merged = nextRelease(current, '1.0.15');
    assert.deepEqual(merged, { upstreamVersion: '1.0.15', revision: 1 });
    assert.deepEqual(nextRelease(merged), { upstreamVersion: '1.0.15', revision: 2 });
});

test('upstream patches 15, 150 and 1500 remain distinct and reversible', () => {
    const cases = [
        ['1.0.15', '1.0.15001'],
        ['1.0.150', '1.0.150001'],
        ['1.0.1500', '1.0.1500001'],
    ];
    const mapped = cases.map(([upstreamVersion, expected]) => {
        const value = versions({ upstreamVersion, revision: 1 });
        assert.equal(value.marketplace, expected);
        const patch = Number(value.marketplace.split('.')[2]);
        assert.equal(Math.floor(patch / 1000), Number(upstreamVersion.split('.')[2]));
        assert.equal(patch % 1000, 1);
        return value.marketplace;
    });
    assert.equal(new Set(mapped).size, cases.length);
    assert.ok(semver.gt(mapped[1], mapped[0]));
    assert.ok(semver.gt(mapped[2], mapped[1]));
    assert.deepEqual(nextRelease({ upstreamVersion: '1.0.15', revision: 88 }, '1.0.150'), { upstreamVersion: '1.0.150', revision: 1 });
});

test('Marketplace ordering survives revision boundaries and upstream minor/major changes', () => {
    for (const [before, after] of [
        [{ upstreamVersion: '1.0.14', revision: 999 }, { upstreamVersion: '1.0.15', revision: 1 }],
        [{ upstreamVersion: '1.0.999', revision: 999 }, { upstreamVersion: '1.1.0', revision: 1 }],
        [{ upstreamVersion: '1.99.999', revision: 999 }, { upstreamVersion: '2.0.0', revision: 1 }],
    ]) assert.ok(semver.gt(versions(after).marketplace, versions(before).marketplace));
});

test('invalid, backwards and overflowing versions fail before writing files', () => {
    assert.throws(() => nextRelease({ upstreamVersion: '1.0.15', revision: 1 }, '1.0.14'), /backwards/);
    assert.throws(() => nextRelease({ upstreamVersion: '1.0.14', revision: 999 }), /revision/);
    for (const upstreamVersion of ['1.0.14.1', '1.0.014', '1.0.15-beta.1']) assert.throws(() => versions({ upstreamVersion, revision: 1 }), /Upstream/);
    for (const revision of [0, -1, 1.5, '1', 1000]) assert.throws(() => versions({ upstreamVersion: '1.0.14', revision }), /revision/);
});

test('release preparation synchronizes source, manifest and lock and detects merge drift', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ceenjs6-version-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'ceenjs6', version: '1.0.14' }));
    fs.writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify({ version: '1.0.14', packages: { '': { version: '1.0.14' } } }));
    const state = { upstreamVersion: '1.0.15', revision: 1 };
    synchronize(directory, state);
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'package.json')));
    assert.equal(manifest.ceenVersion, '1.0.15.1');
    assert.equal(manifest.upstreamVersion, '1.0.15');
    assert.equal(manifest.version, '1.0.15001');
    assert.doesNotThrow(() => synchronize(directory, state, true));
    const lock = JSON.parse(fs.readFileSync(path.join(directory, 'package-lock.json')));
    lock.packages[''].version = '1.0.15';
    fs.writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify(lock));
    assert.throws(() => synchronize(directory, state, true), /out of sync/);
});
