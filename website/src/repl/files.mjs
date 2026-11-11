import {
  processSampleMap,
  registerSamplesPrefix,
  registerSound,
  onTriggerSample,
  getAudioContext,
  loadBuffer,
} from '@strudel/webaudio';

let TAURI;
if (typeof window !== 'undefined') {
  TAURI = window?.__TAURI__;
}
// Tauri v2 fs plugin (exposed on window.__TAURI__.fs via withGlobalTauri)
const fs = TAURI?.fs || {};
export const BaseDirectory = fs.BaseDirectory;
export const dir = BaseDirectory?.Audio; // https://v2.tauri.app/reference/javascript/api/namespacepath/#audiodir
const fsOptions = { baseDir: dir };
const prefix = '~/music/';

const readTextFile = (path) => fs.readTextFile(path, fsOptions);
const writeTextFile = (path, contents) => fs.writeTextFile(path, contents, fsOptions);

// v2 readDir is flat and returns { name, isDirectory, isFile }.
// This keeps the v1 tree shape ({ name, children? }) the rest of the app expects.
export async function readDir(path = '', { recursive = false } = {}) {
  const entries = await fs.readDir(path, fsOptions);
  return Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory) {
        return { name: entry.name };
      }
      const subpath = path ? `${path}/${entry.name}` : entry.name;
      return { name: entry.name, children: recursive ? await readDir(subpath, { recursive }) : [] };
    }),
  );
}

async function hasStrudelJson(subpath) {
  return fs.exists(subpath + '/strudel.json', fsOptions);
}

async function loadStrudelJson(subpath) {
  const contents = await readTextFile(subpath + '/strudel.json');
  const sampleMap = JSON.parse(contents);
  processSampleMap(sampleMap, (key, bank) => {
    registerSound(key, (t, hapValue, onended) => onTriggerSample(t, hapValue, onended, bank, fileResolver(subpath)), {
      type: 'sample',
      samples: bank,
      fileSystem: true,
      tag: 'local',
    });
  });
}

async function writeStrudelJson(subpath) {
  const children = await readDir(subpath, { recursive: true });
  const name = subpath.split('/').slice(-1)[0];
  const tree = { name, children };

  let samples = {};
  let count = 0;
  walkFileTree(tree, (entry, parent) => {
    if (['wav', 'mp3'].includes(entry.name.split('.').slice(-1)[0])) {
      samples[parent.name] = samples[parent.name] || [];
      count += 1;
      samples[parent.name].push(entry.subpath.slice(1).concat([entry.name]).join('/'));
    }
  });
  const json = JSON.stringify(samples, null, 2);
  const filepath = subpath + '/strudel.json';
  await writeTextFile(filepath, json);
  console.log(`wrote strudel.json with ${count} samples to ${subpath}!`);
}

registerSamplesPrefix(prefix, async (path) => {
  const subpath = path.replace(prefix, '');
  const hasJson = await hasStrudelJson(subpath);
  if (!hasJson) {
    await writeStrudelJson(subpath);
  }
  return loadStrudelJson(subpath);
});

export const walkFileTree = (node, fn) => {
  if (!Array.isArray(node?.children)) {
    return;
  }
  for (const entry of node.children) {
    entry.subpath = (node.subpath || []).concat([node.name]);
    fn(entry, node);
    if (entry.children) {
      walkFileTree(entry, fn);
    }
  }
};

export const isAudioFile = (filename) =>
  ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac'].includes(filename.split('.').slice(-1)[0]);

function uint8ArrayToDataURL(uint8Array) {
  const blob = new Blob([uint8Array], { type: 'audio/*' });
  const dataURL = URL.createObjectURL(blob);
  return dataURL;
}

const loadCache = {}; // caches local urls to data urls
export async function resolveFileURL(url) {
  if (loadCache[url]) {
    return loadCache[url];
  }
  loadCache[url] = (async () => {
    const contents = await fs.readFile(url, fsOptions);
    return uint8ArrayToDataURL(contents);
  })();
  return loadCache[url];
}

const fileResolver = (subpath) => (url) => resolveFileURL(subpath.endsWith('/') ? subpath + url : subpath + '/' + url);

export async function playFile(path) {
  const url = await resolveFileURL(path);
  const ac = getAudioContext();
  const bufferSource = ac.createBufferSource();
  bufferSource.buffer = await loadBuffer(url, ac);
  bufferSource.connect(ac.destination);
  bufferSource.start(ac.currentTime);
}
