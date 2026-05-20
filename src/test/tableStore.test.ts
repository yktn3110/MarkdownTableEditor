import { useAppStore } from '../store/tableStore';
import { parseMarkdown, serializeTableToMarkdown } from '../core/parser';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

function resetStore() {
  useAppStore.setState({
    filePath: null,
    rawContent: '',
    tables: [],
    activeTableIndex: 0,
    edits: {},
    undoStacks: {},
    redoStacks: {},
    isDirty: false,
  });
}

const SIMPLE_MD = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';

// ---------------------------------------------------------------------------
// openFile
// ---------------------------------------------------------------------------

describe('tableStore / openFile', () => {
  beforeEach(resetStore);

  test('#1 テーブルがパースされ edits が初期化される', () => {
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    const { tables, edits, isDirty } = useAppStore.getState();
    expect(tables).toHaveLength(1);
    expect(edits['table-0']).toBeDefined();
    expect(edits['table-0'].headerRow).toEqual(['A', 'B']);
    expect(edits['table-0'].dataRows).toEqual([['1', '2'], ['3', '4']]);
    expect(isDirty).toBe(false);
  });

  test('#2 activeTableIndex が 0 にリセットされる', () => {
    useAppStore.setState({ activeTableIndex: 2 });
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    expect(useAppStore.getState().activeTableIndex).toBe(0);
  });

  test('#3 undoStacks / redoStacks がリセットされる', () => {
    useAppStore.setState({
      undoStacks: { 'table-0': [{ headerRow: [], dataRows: [] }] },
      redoStacks: { 'table-0': [{ headerRow: [], dataRows: [] }] },
    });
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    expect(useAppStore.getState().undoStacks).toEqual({});
    expect(useAppStore.getState().redoStacks).toEqual({});
  });

  test('#4 テーブルが無い Markdown → tables が空', () => {
    useAppStore.getState().openFile('/test.md', '# タイトル\n本文のみ');
    expect(useAppStore.getState().tables).toHaveLength(0);
  });

  test('#5 複数テーブル → edits に全テーブルのエントリが入る', () => {
    const md = '| A |\n|---|\n| 1 |\n\n| B |\n|---|\n| 2 |';
    useAppStore.getState().openFile('/test.md', md);
    const { edits } = useAppStore.getState();
    expect(edits['table-0']).toBeDefined();
    expect(edits['table-1']).toBeDefined();
  });

  test('#6 filePath と rawContent が保存される', () => {
    useAppStore.getState().openFile('/path/to/file.md', SIMPLE_MD);
    const { filePath, rawContent } = useAppStore.getState();
    expect(filePath).toBe('/path/to/file.md');
    expect(rawContent).toBe(SIMPLE_MD);
  });
});

// ---------------------------------------------------------------------------
// commitEdit
// ---------------------------------------------------------------------------

describe('tableStore / commitEdit', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
  });

  test('#7 edits が更新される', () => {
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], [['10', '20']]);
    const { edits } = useAppStore.getState();
    expect(edits['table-0'].headerRow).toEqual(['X', 'Y']);
    expect(edits['table-0'].dataRows).toEqual([['10', '20']]);
  });

  test('#8 isDirty が true になる', () => {
    useAppStore.getState().commitEdit('table-0', ['A', 'B'], [['1', '2']]);
    expect(useAppStore.getState().isDirty).toBe(true);
  });

  test('#9 直前の状態が undoStack に積まれる', () => {
    const before = { ...useAppStore.getState().edits['table-0'] };
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], []);
    const stack = useAppStore.getState().undoStacks['table-0'];
    expect(stack).toHaveLength(1);
    expect(stack[0]).toEqual(before);
  });

  test('#10 commitEdit で redoStack がクリアされる', () => {
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], []);
    useAppStore.getState().undo('table-0');
    expect(useAppStore.getState().redoStacks['table-0']).toHaveLength(1);
    useAppStore.getState().commitEdit('table-0', ['Z', 'W'], []);
    expect(useAppStore.getState().redoStacks['table-0']).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// undo / redo
// ---------------------------------------------------------------------------

describe('tableStore / undo / redo', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
  });

  test('#11 undo でひとつ前の状態に戻る', () => {
    const original = { ...useAppStore.getState().edits['table-0'] };
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], [['10', '20']]);
    useAppStore.getState().undo('table-0');
    expect(useAppStore.getState().edits['table-0']).toEqual(original);
  });

  test('#12 undo スタックが空のとき undo は何もしない', () => {
    const before = { ...useAppStore.getState().edits['table-0'] };
    useAppStore.getState().undo('table-0');
    expect(useAppStore.getState().edits['table-0']).toEqual(before);
  });

  test('#13 redo で undo した状態をやり直せる', () => {
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], [['10', '20']]);
    const after = { ...useAppStore.getState().edits['table-0'] };
    useAppStore.getState().undo('table-0');
    useAppStore.getState().redo('table-0');
    expect(useAppStore.getState().edits['table-0']).toEqual(after);
  });

  test('#14 redo スタックが空のとき redo は何もしない', () => {
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], []);
    const before = { ...useAppStore.getState().edits['table-0'] };
    useAppStore.getState().redo('table-0');
    expect(useAppStore.getState().edits['table-0']).toEqual(before);
  });

  test('#15 undo → undo で2段階戻れる', () => {
    const s0 = { ...useAppStore.getState().edits['table-0'] };
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], [['10', '20']]);
    useAppStore.getState().commitEdit('table-0', ['Z', 'W'], [['30', '40']]);
    useAppStore.getState().undo('table-0');
    useAppStore.getState().undo('table-0');
    expect(useAppStore.getState().edits['table-0']).toEqual(s0);
  });

  test('#16 undo 後に新しい編集 → redo は使えない', () => {
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], []);
    useAppStore.getState().undo('table-0');
    useAppStore.getState().commitEdit('table-0', ['Z', 'W'], []);
    const current = { ...useAppStore.getState().edits['table-0'] };
    useAppStore.getState().redo('table-0');
    expect(useAppStore.getState().edits['table-0']).toEqual(current);
  });

  test('#17 undo でも isDirty は true のまま', () => {
    useAppStore.getState().commitEdit('table-0', ['X', 'Y'], []);
    useAppStore.getState().undo('table-0');
    expect(useAppStore.getState().isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// undo スタック上限
// ---------------------------------------------------------------------------

describe('tableStore / undo スタック上限', () => {
  test('#18 MAX_UNDO(50) を超えると古いエントリが捨てられる', () => {
    resetStore();
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    for (let i = 0; i < 55; i++) {
      useAppStore.getState().commitEdit('table-0', ['A', 'B'], [[String(i), '']]);
    }
    expect(useAppStore.getState().undoStacks['table-0'].length).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// addRow / deleteRow
// ---------------------------------------------------------------------------

describe('tableStore / addRow / deleteRow', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
  });

  test('#19 addRow で末尾に空行が追加される', () => {
    const before = useAppStore.getState().edits['table-0'].dataRows.length;
    useAppStore.getState().addRow('table-0');
    const after = useAppStore.getState().edits['table-0'].dataRows;
    expect(after).toHaveLength(before + 1);
    expect(after[after.length - 1]).toEqual(['', '']);
  });

  test('#20 addRow で追加行の列数がヘッダーと一致する', () => {
    useAppStore.getState().addRow('table-0');
    const { edits } = useAppStore.getState();
    const newRow = edits['table-0'].dataRows[edits['table-0'].dataRows.length - 1];
    expect(newRow).toHaveLength(edits['table-0'].headerRow.length);
  });

  test('#21 deleteRow で指定行が削除される', () => {
    const before = useAppStore.getState().edits['table-0'].dataRows;
    useAppStore.getState().deleteRow('table-0', 0);
    const after = useAppStore.getState().edits['table-0'].dataRows;
    expect(after).toHaveLength(before.length - 1);
    expect(after[0]).toEqual(before[1]);
  });

  test('#22 deleteRow を繰り返して dataRows が空になる', () => {
    useAppStore.getState().deleteRow('table-0', 1);
    useAppStore.getState().deleteRow('table-0', 0);
    expect(useAppStore.getState().edits['table-0'].dataRows).toHaveLength(0);
  });

  test('#23 addRow → deleteRow で元の行数に戻る', () => {
    const before = useAppStore.getState().edits['table-0'].dataRows.length;
    useAppStore.getState().addRow('table-0');
    const rows = useAppStore.getState().edits['table-0'].dataRows;
    useAppStore.getState().deleteRow('table-0', rows.length - 1);
    expect(useAppStore.getState().edits['table-0'].dataRows).toHaveLength(before);
  });
});

// ---------------------------------------------------------------------------
// addColumn / deleteColumn
// ---------------------------------------------------------------------------

describe('tableStore / addColumn / deleteColumn', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
  });

  test('#24 addColumn でヘッダーに空列が追加される', () => {
    useAppStore.getState().addColumn('table-0');
    const { headerRow } = useAppStore.getState().edits['table-0'];
    expect(headerRow).toHaveLength(3);
    expect(headerRow[2]).toBe('');
  });

  test('#25 addColumn で全データ行にも空セルが追加される', () => {
    useAppStore.getState().addColumn('table-0');
    const { dataRows } = useAppStore.getState().edits['table-0'];
    for (const row of dataRows) {
      expect(row).toHaveLength(3);
      expect(row[2]).toBe('');
    }
  });

  test('#26 deleteColumn で指定列が削除される', () => {
    // SIMPLE_MD: header=["A","B"]、col_0 を削除 → header=["B"]
    useAppStore.getState().deleteColumn('table-0', 0);
    const { headerRow, dataRows } = useAppStore.getState().edits['table-0'];
    expect(headerRow).toEqual(['B']);
    expect(dataRows[0]).toEqual(['2']);
    expect(dataRows[1]).toEqual(['4']);
  });

  test('#27 deleteColumn で全行から同じ列が削除される', () => {
    useAppStore.getState().deleteColumn('table-0', 1);
    const { dataRows } = useAppStore.getState().edits['table-0'];
    for (const row of dataRows) {
      expect(row).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------------
// moveRow
// ---------------------------------------------------------------------------

describe('tableStore / moveRow', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
  });

  test('#28 moveRow(0, 1) で行の順序が入れ替わる', () => {
    useAppStore.getState().moveRow('table-0', 0, 1);
    const { dataRows } = useAppStore.getState().edits['table-0'];
    expect(dataRows[0]).toEqual(['3', '4']);
    expect(dataRows[1]).toEqual(['1', '2']);
  });

  test('#29 moveRow(1, 0) も正しく動く', () => {
    useAppStore.getState().moveRow('table-0', 1, 0);
    const { dataRows } = useAppStore.getState().edits['table-0'];
    expect(dataRows[0]).toEqual(['3', '4']);
    expect(dataRows[1]).toEqual(['1', '2']);
  });

  test('#30 moveRow で行数は変わらない', () => {
    const before = useAppStore.getState().edits['table-0'].dataRows.length;
    useAppStore.getState().moveRow('table-0', 0, 1);
    expect(useAppStore.getState().edits['table-0'].dataRows).toHaveLength(before);
  });
});

// ---------------------------------------------------------------------------
// getSaveContent
// ---------------------------------------------------------------------------

describe('tableStore / getSaveContent', () => {
  beforeEach(resetStore);

  test('#31 テーブル前後のテキストが保持される', () => {
    const md = '前のテキスト\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n後のテキスト';
    useAppStore.getState().openFile('/test.md', md);
    const result = useAppStore.getState().getSaveContent();
    expect(result).toContain('前のテキスト');
    expect(result).toContain('後のテキスト');
  });

  test('#32 行を追加した後 getSaveContent に新しい行が含まれる', () => {
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    useAppStore.getState().addRow('table-0');
    const result = useAppStore.getState().getSaveContent();
    // ヘッダー + セパレータ + 元2行 + 新空行 = 5行
    const lines = result.trim().split('\n');
    expect(lines).toHaveLength(5);
  });

  test('#33 複数テーブルで2番目のみ編集 → 1番目は変わらない', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |\n\n| C | D |\n|---|---|\n| 3 | 4 |';
    useAppStore.getState().openFile('/test.md', md);
    useAppStore.getState().commitEdit('table-1', ['C', 'D'], [['X', 'Y']]);
    const result = useAppStore.getState().getSaveContent();
    expect(result).toContain('| 1 | 2 |');
    expect(result).toContain('| X | Y |');
  });

  test('#34 セル内 \\n が <br> に変換されて保存される', () => {
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    useAppStore.getState().commitEdit('table-0', ['A', 'B'], [['行1\n行2', '値']]);
    const result = useAppStore.getState().getSaveContent();
    expect(result).toContain('行1<br>行2');
  });

  test('#35 | を含むセル値が \\| にエスケープされて保存される', () => {
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    useAppStore.getState().commitEdit('table-0', ['A', 'B'], [['A|B', '値']]);
    const result = useAppStore.getState().getSaveContent();
    expect(result).toContain('A\\|B');
  });
});

// ---------------------------------------------------------------------------
// markSaved
// ---------------------------------------------------------------------------

describe('tableStore / markSaved', () => {
  test('#36 markSaved で isDirty が false になる', () => {
    resetStore();
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    useAppStore.getState().commitEdit('table-0', ['A', 'B'], []);
    expect(useAppStore.getState().isDirty).toBe(true);
    useAppStore.getState().markSaved();
    expect(useAppStore.getState().isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 長い行のパース・シリアライズ・保存
// ---------------------------------------------------------------------------

describe('長い行 / parseMarkdown', () => {
  const LONG_TEXT = 'あ'.repeat(500);

  test('#37 500文字のセルが欠けずにパースされる', () => {
    const md = `| 内容 |\n|---|\n| ${LONG_TEXT} |`;
    const result = parseMarkdown(md);
    expect(result[0].dataRows[0][0]).toBe(LONG_TEXT);
  });

  test('#38 長いセルが複数列あってもそれぞれ正しくパースされる', () => {
    const LONG_A = 'a'.repeat(300);
    const LONG_B = 'b'.repeat(400);
    const md = `| A | B |\n|---|---|\n| ${LONG_A} | ${LONG_B} |`;
    const result = parseMarkdown(md);
    expect(result[0].dataRows[0][0]).toBe(LONG_A);
    expect(result[0].dataRows[0][1]).toBe(LONG_B);
  });
});

describe('長い行 / serializeTableToMarkdown', () => {
  const LONG_TEXT = 'x'.repeat(500);

  test('#39 500文字のセルを含む行でもパイプ区切りが壊れない', () => {
    const result = serializeTableToMarkdown(['Col'], [[LONG_TEXT]]);
    const lines = result.trim().split('\n');
    // 全行が | で始まり | で終わる
    for (const line of lines) {
      expect(line.startsWith('|')).toBe(true);
      expect(line.endsWith('|')).toBe(true);
    }
  });

  test('#40 長いセル値が途中で切り捨てられない', () => {
    const result = serializeTableToMarkdown(['Col'], [[LONG_TEXT]]);
    expect(result).toContain(LONG_TEXT);
  });
});

describe('長い行 / getSaveContent', () => {
  beforeEach(resetStore);

  test('#41 長いセル値を含む編集が getSaveContent で正しく出力される', () => {
    const LONG_TEXT = 'z'.repeat(500);
    useAppStore.getState().openFile('/test.md', SIMPLE_MD);
    useAppStore.getState().commitEdit('table-0', ['A', 'B'], [[LONG_TEXT, '']]);
    const result = useAppStore.getState().getSaveContent();
    expect(result).toContain(LONG_TEXT);
  });

  test('#42 長い行を含む複数テーブルのオフセット計算が正しい', () => {
    const LONG_TEXT = 'あ'.repeat(200);
    const md = `| A |\n|---|\n| ${LONG_TEXT} |\n\n| B |\n|---|\n| 短い |`;
    useAppStore.getState().openFile('/test.md', md);
    useAppStore.getState().commitEdit('table-1', ['B'], [['編集済み']]);
    const result = useAppStore.getState().getSaveContent();
    // 1つ目のテーブルの長いテキストが残っている
    expect(result).toContain(LONG_TEXT);
    // 2つ目のテーブルが編集後の値になっている
    expect(result).toContain('編集済み');
    // 「短い」は消えているはず
    expect(result).not.toContain('短い');
  });

  test('#43 長い行を含むテーブルの往復テスト（parse → edit → save → parse）', () => {
    const LONG_TEXT = '長いテキスト'.repeat(100); // 600文字
    const md = `| 列 |\n|---|\n| ${LONG_TEXT} |`;
    useAppStore.getState().openFile('/test.md', md);
    // ヘッダーを変更
    useAppStore.getState().commitEdit('table-0', ['変更後ヘッダー'], [[LONG_TEXT]]);
    const saved = useAppStore.getState().getSaveContent();
    // 保存後の内容を再パース
    const reparsed = parseMarkdown(saved);
    expect(reparsed[0].headerRow[0]).toBe('変更後ヘッダー');
    expect(reparsed[0].dataRows[0][0]).toBe(LONG_TEXT);
  });
});
