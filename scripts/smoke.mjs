#!/usr/bin/env node
// Lightweight, host-free smoke test for dsh-nl-model-switch.
// It does NOT load the DSH host; it statically verifies the package
// contract that the harness and the marketplace rely on.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (p) => readFileSync(join(root, p), 'utf8');

let failures = 0;
function check(name, cond) {
  if (!cond) { console.error('FAIL: ' + name); failures++; }
  else console.log('ok  : ' + name);
}

const pkg = JSON.parse(read('package.json'));
check('package name is dsh-nl-model-switch', pkg.name === 'dsh-nl-model-switch');
check('type is module', pkg.type === 'module');
check('main is lib/index.js', pkg.main === 'lib/index.js');
check('dsh.bundle.patch points at cordis.patch.yml', pkg.dsh?.bundle?.patch === './cordis.patch.yml');
check('license is MIT', pkg.license === 'MIT');
check('repository points at the GitHub repo', pkg.repository?.url?.includes('passingby000/dsh-nl-model-switch'));

const patch = read('cordis.patch.yml');
check('cordis patch inserts the plugin id', /id:\s*dsh-nl-model-switch/.test(patch));

const src = read('lib/index.js');
check('lib/index.js is valid UTF-8', Buffer.from(src, 'utf8').toString('utf8') === src);
check('exports the plugin name', /export const name\s*=\s*'dsh-nl-model-switch'/.test(src));
check('registers a switch_model tool', /name:\s*SWITCH_TOOL_NAME|name:\s*'switch_model'/.test(src) || /SWITCH_TOOL_NAME\s*=\s*'switch_model'/.test(src));
check('calls the native sessions.selectModel surface', /sessions\.selectModel/.test(src));
check('calls sessions.models to read current model', /sessions\.models\b/.test(src));
check('injects the required host services', /inject\s*=\s*\[.*'tools'.*'systemPrompt'.*'apiProxy'/.test(src));

process.exit(failures === 0 ? 0 : 1);