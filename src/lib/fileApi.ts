export async function openFile(): Promise<{ path: string; content: string } | null> {
  const res = await fetch('/api/open-file-dialog', { method: 'POST' });
  if (!res.ok) {
    const { error } = await res.json();
    alert(error);
    return null;
  }
  const { path, content } = await res.json();
  if (!path) return null;
  return { path, content };
}

export async function saveFile(path: string, content: string): Promise<void> {
  const res = await fetch('/api/save-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    alert('保存に失敗しました: ' + error);
  }
}
