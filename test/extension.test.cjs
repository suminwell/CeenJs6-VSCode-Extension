const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { createRequire } = require('node:module');
const manifest = require('../package.json');

function load(name, overrides = {}, globals = {}) {
    const filename = path.resolve('out', `${name}.js`);
    const nativeRequire = createRequire(filename);
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        module, exports: module.exports, __dirname: path.dirname(filename), __filename: filename,
        Buffer, process, console, setTimeout, clearTimeout, setInterval, clearInterval,
        require: id => Object.hasOwn(overrides, id) ? overrides[id] : nativeRequire(id),
        ...globals,
    }, { filename });
    return module.exports;
}
const logger = { logDebug() {} };
const ui = { window: { showErrorMessage: () => Promise.resolve(), showWarningMessage() {} } };
const extensionMock = { ...logger, connectedServerAdb: new Set(), connectedServerLan: new Set(), ConnectionType: { CLIENT_LAN: 0, SERVER_LAN: 1, SERVER_ADB: 2 }, Extension: { commands: [] } };
function deviceModule(netOverride, globals) {
    return load('device', { './extension': extensionMock, './project': {}, vscode: ui, ...(netOverride && { net: netOverride }) }, globals);
}
class Socket extends EventEmitter {
    constructor() { super(); this.writes = []; this.remoteAddress = '127.0.0.1'; this.remotePort = 7347; this.destroyed = false; }
    write(value) { this.writes.push(Buffer.from(value)); }
    destroy() { if (!this.destroyed) { this.destroyed = true; this.emit('close', false); } }
    connect(port, host, callback) { callback(); }
}
function frame(data, type = 1) {
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
    const header = Buffer.alloc(8);
    header.writeInt32BE(payload.length, 0); header.writeInt32BE(type, 4);
    return Buffer.concat([header, payload]);
}
function mockExtension(overrides = {}) {
    return load('extension', {
        vscode: { ThemeIcon: class {}, ...ui }, './i18n': { default: {} }, './util': {}, './adb': {}, './awaiter': {}, './device': {}, './project': {},
        ...overrides,
    });
}

test('independent Marketplace identity and command namespace', () => {
    assert.equal(`${manifest.publisher}.${manifest.name}`, 'yeceen.ceenjs6');
    assert.equal(manifest.displayName, 'CeenJs6');
    const { Extension } = mockExtension({ http: { createServer() { throw new Error('Import must not open listeners'); } } });
    assert.deepEqual(manifest.contributes.commands.map(c => c.command).sort(), Array.from(Extension.commands, c => `ceenjs6.${c}`).sort());
    assert.equal(manifest.contributes.configuration.properties['ceenjs6.enableHttpControl'].default, false);
});

test('unchanged scans retain state and subsequent deletions are reported', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ceenjs6-diff-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const { FileObserver } = load('diff', { './extension': logger });
    fs.writeFileSync(path.join(directory, 'main.js'), 'toastLog("CeenJs6")');
    const observer = new FileObserver(directory);
    assert.equal((await observer.walk()).modified.length, 1);
    assert.equal((await observer.walk()).modified.length, 0);
    assert.equal((await observer.walk()).modified.length, 0);
    fs.unlinkSync(path.join(directory, 'main.js'));
    assert.equal((await observer.walk()).deleted[0], 'main.js');
    assert.equal((await observer.walk()).deleted.length, 0);
});

test('TCP parser accepts split headers, split UTF-8 and concatenated frames', t => {
    const { Device } = deviceModule();
    const socket = new Socket(); const device = new Device(socket);
    t.after(() => socket.destroy());
    const messages = [];
    device.on('message', data => messages.push(data));
    const first = frame({ type: 'log', data: { log: 'CeenJs6 中文日志' } });
    socket.emit('data', first.subarray(0, 3));
    socket.emit('data', first.subarray(3, 11));
    assert.equal(messages.length, 0);
    socket.emit('data', Buffer.concat([first.subarray(11), frame({ type: 'log', data: { log: 'second' } })]));
    assert.equal(messages.length, 2);
    assert.equal(messages[0].data.log, 'CeenJs6 中文日志');
    assert.equal(messages[1].data.log, 'second');
});

test('invalid frame lengths and types close the connection', () => {
    const { Device } = deviceModule();
    for (const [length, type] of [[-1, 1], [64 * 1024 * 1024 + 1, 1], [1, 99]]) {
        const socket = new Socket(); new Device(socket);
        const header = Buffer.alloc(8); header.writeInt32BE(length, 0); header.writeInt32BE(type, 4);
        socket.emit('data', header);
        assert.equal(socket.destroyed, true);
    }
});

test('close before handshake safely cancels timeout', () => {
    let timeout; let cleared = 0;
    const { Device } = deviceModule(null, { setTimeout: callback => { timeout = callback; return 1; }, clearTimeout: () => cleared++ });
    const socket = new Socket(); new Device(socket);
    socket.destroy();
    assert.ok(cleared > 0);
    assert.doesNotThrow(() => timeout());
});

test('CeenJs6 hello returns compatible extension version only once', t => {
    const { Device } = deviceModule();
    const socket = new Socket(); const device = new Device(socket);
    t.after(() => socket.destroy());
    let attaches = 0; device.on('attach', () => attaches++);
    const hello = frame({ type: 'hello', data: { device_name: 'CeenJs6 test', device_id: 'test', app_version: '6.7.0', app_version_code: Number(manifest.requiredClientVersionCode) } });
    socket.emit('data', hello); socket.emit('data', hello);
    assert.equal(attaches, 1);
    const response = Buffer.concat(socket.writes);
    assert.equal(response.readInt32BE(4), 1);
    assert.equal(JSON.parse(response.subarray(8).toString()).data.extensionVersion, manifest.version);
});

test('handshake disconnect rejects connectTo instead of leaving it pending', async () => {
    let socket;
    const server = new EventEmitter(); server.listen = (port, callback) => callback(); server.close = () => {};
    const { Devices } = deviceModule({ createServer: () => server, Socket: class extends Socket { constructor() { super(); socket = this; } } });
    const devices = new Devices();
    const pending = devices.connectTo('127.0.0.1', 7347, 1);
    socket.destroy();
    await assert.rejects(pending, /握手完成前断开/);
    devices.dispose();
});

test('ADB device parsing supports macOS/Linux LF and Windows CRLF', () => {
    const { Extension } = mockExtension();
    for (const newline of ['\n', '\r\n']) {
        const extension = Object.create(Extension.prototype);
        extension.adb = { exec: args => args[0] === 'devices'
            ? { status: 0, stdout: Buffer.from(['List of devices attached', 'one device product:x model:m device:d', 'two device product:y model:n device:d', ''].join(newline)) }
            : { stdout: Buffer.from('Ceen') } };
        assert.equal(extension.listAdbDevices().size, 2);
    }
});

test('ADB missing executable preserves the real spawn error', () => {
    const { Adb } = load('adb');
    assert.throws(() => Adb.throwsIfNeeded({ status: null, signal: null, error: new Error('spawn adb ENOENT'), stderr: null, stdout: null }), /spawn adb ENOENT/);
});

test('new project template uses CeenJs6 runtime and pinned declarations', () => {
    const template = require('../assets/template/package.json');
    assert.match(template.devDependencies.ceenjs6, /^https:\/\/codeload.github.com\/suminwell\/CeenJs6-TypeScript-Declarations\/tar.gz\/[a-f0-9]{40}$/);
    assert.match(require('../assets/template/project.json').packageName, /^org\.ceenjs\.ceenjs6\./);
    const sample = fs.readFileSync('assets/template/modules/ceenjs-utils.js', 'utf8');
    assert.match(sample, /app\.ceenjs\.versionName/);
    assert.doesNotMatch(sample, /app\.autojs|R\.strings/);
});

test('opt-in HTTP control binds only loopback and handles listen errors', () => {
    let handler, listening; let commands = 0; let closed = 0;
    const httpServer = new EventEmitter();
    httpServer.listen = (port, host, callback) => { listening = { port, host }; callback(); };
    httpServer.address = () => ({ port: 10347 });
    httpServer.close = () => closed++;
    const channel = { appendLine() {}, dispose() {} };
    const disposable = { dispose() {} };
    class Devices extends EventEmitter {
        constructor() { super(); this.devices = []; }
        sendCommand(command) { assert.equal(command, 'stopAll'); commands++; }
        dispose() {}
    }
    const extension = mockExtension({
        http: { createServer: callback => { handler = callback; return httpServer; } },
        './device': { Devices, HTTP_SERVER_PORT: 10347 }, './adb': { Adb: class {} },
        vscode: { ThemeIcon: class {}, ...ui, commands: { registerCommand: () => disposable },
            window: { ...ui.window, createOutputChannel: () => channel, onDidChangeActiveTextEditor: () => disposable },
            workspace: { getConfiguration: () => ({ get: () => true }) },
        },
    });
    const context = { extensionPath: process.cwd(), subscriptions: [], globalState: { get: () => [], keys: () => [], update() {} } };
    extension.activate(context);
    assert.deepEqual(listening, { host: '127.0.0.1', port: 10347 });
    let status;
    handler({ method: 'GET', url: '/exec?cmd=stopAll' }, { writeHead: code => status = code, end() {} });
    assert.equal(status, 200); assert.equal(commands, 1);
    handler({ method: 'GET', url: '/exec?cmd=run&cmd=stopAll' }, { writeHead: code => status = code, end() {} });
    assert.equal(status, 400); assert.equal(commands, 1);
    assert.doesNotThrow(() => httpServer.emit('error', new Error('address already in use')));
    for (const subscription of context.subscriptions) subscription.dispose();
    extension.deactivate();
    assert.equal(closed, 1);
});
