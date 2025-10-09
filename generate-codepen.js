const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const readline = require('readline/promises');

async function promptInputs() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    let folder = (await rl.question('Relative path to folder with one HTML, one CSS, one JS: ')).trim();
    while (!folder) {
      folder = (await rl.question('Please enter a non-empty folder path: ')).trim();
    }
    let projectName = (await rl.question('Project name: ')).trim();
    while (!projectName) {
      projectName = (await rl.question('Please enter a non-empty project name: ')).trim();
    }
    return { folder, projectName };
  } finally {
    rl.close();
  }
}

async function assertDirectoryExists(dirPath) {
  const abs = path.resolve(process.cwd(), dirPath);
  let stats;
  try {
    stats = fs.statSync(abs);
  } catch {
    throw new Error(`Folder not found: ${abs}`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${abs}`);
  }
  return abs;
}

async function findSingleFileByExtensions(dir, exts) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = entries.filter(e => e.isFile()).map(e => e.name);
  const matches = files.filter(name => exts.some(ext => name.toLowerCase().endsWith(ext)));
  if (matches.length === 0) {
    throw new Error(`No files found with extensions ${exts.join(', ')} in ${dir}`);
  }
  if (matches.length > 1) {
    throw new Error(`Expected exactly one of ${exts.join(', ')} in ${dir}, found: ${matches.join(', ')}`);
  }
  return path.join(dir, matches[0]);
}

function extractHtmlBody(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const withoutScriptBlocks = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return withoutScriptBlocks.replace(/<script\b[^>]*\/>/gi, '');
}

function openViaLocalPrefill(payload) {
  const htmlJson = JSON.stringify(payload)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
  const html = `<!doctype html><meta charset="utf-8"><form id="f" action="https://codepen.io/pen/define" method="POST" target="_blank"><input type="hidden" name="data" value="${htmlJson}"></form><script>document.getElementById('f').submit();</script>`;
  const filePath = path.join(os.tmpdir(), `codepen-prefill-${Date.now()}.html`);
  fs.writeFileSync(filePath, html);
  openInBrowser(filePath);
}

function openInBrowser(url) {
  const platform = process.platform;
  if (platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    return;
  }
  spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
}

async function main() {
  const { folder, projectName } = await promptInputs();
  const dir = await assertDirectoryExists(folder);
  const htmlPath = await findSingleFileByExtensions(dir, ['.html', '.htm']);
  const cssPath = await findSingleFileByExtensions(dir, ['.css']);
  const jsPath = await findSingleFileByExtensions(dir, ['.js']);

  const htmlRaw = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');
  const html = extractHtmlBody(htmlRaw);

  const payload = { title: projectName, html, css, js, editors: '101' };
  openViaLocalPrefill(payload);
  const qs = payload.editors ? `?editors=${encodeURIComponent(payload.editors)}` : '';
  const finalUrl = `https://codepen.io/pen/${qs}`;
  process.stdout.write(`${finalUrl}\n`);
}

main().catch(err => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});


