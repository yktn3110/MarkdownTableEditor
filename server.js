import express from 'express';
import open from 'open';
import { exec } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const app = express();
app.use(express.json({ limit: '10mb' }));

// esbuild が --define で '1' に置き換える。開発時は undefined のまま
const IS_PACKAGED = process.env.TABLEDRAFT_PACKAGED === '1';

// パッケージ版: exe と同じフォルダの dist/ を配信
if (IS_PACKAGED) {
  const baseDir = dirname(process.execPath);
  app.use(express.static(join(baseDir, 'dist')));
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function runPsScript(script) {
  const wrapped = `
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
${script}
`.trim();
  const encoded = Buffer.from(wrapped, 'utf16le').toString('base64');
  const { stdout } = await execAsync(
    `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
    { encoding: 'buffer' }
  );
  // PowerShell が CLIXML ノイズを stdout に出力する場合があるためフィルタする
  const lines = stdout.toString('utf-8')
    .split('\n')
    .map(l => l.replace(/\r/g, ''))
    .filter(l => l.length > 0 && !l.startsWith('#<') && !l.startsWith('<'));
  return lines[lines.length - 1] ?? '';
}

app.post('/api/open-file-dialog', async (req, res) => {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.StartPosition = 'CenterScreen'
$null = $owner.Handle
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Filter = "Markdown files (*.md;*.markdown)|*.md;*.markdown|All files (*.*)|*.*"
$dialog.Title = "Markdownファイルを開く"
$result = $dialog.ShowDialog($owner)
$owner.Dispose()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.FileName
}
`;
  try {
    const path = await runPsScript(script);
    if (!path) return res.json({ path: null, content: null });
    const buf = await readFile(path);
    if (buf.length > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'ファイルサイズが5MBを超えているため開けません。' });
    }
    res.json({ path, content: buf.toString('utf-8') });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/save-file', async (req, res) => {
  const { path, content } = req.body;
  if (!path || content == null) {
    return res.status(400).json({ error: 'path and content are required' });
  }
  try {
    await writeFile(path, content, 'utf-8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`TableDraft: ${url}`);
  if (IS_PACKAGED) {
    open(url);
  } else {
    console.log(`Open http://localhost:5173 in your browser`);
  }
});
