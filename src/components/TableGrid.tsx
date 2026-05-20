import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { DataGrid, Column, RenderEditCellProps, RenderCellProps, DataGridHandle } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useAppStore } from '../store/tableStore';

type RowData = { _rowIndex: number; [key: string]: string | number };

// ---------- セル編集エディタ ----------

interface EditorNavProps {
  gridRef: React.RefObject<DataGridHandle | null>;
  colIdx: number;
  colCount: number;
  rowCount: number;
  onNavigated: (rowIdx: number) => void;
}

export function MultilineEditor({ row, column, onRowChange, onClose, gridRef, colIdx, colCount, rowCount, onNavigated }: RenderEditCellProps<RowData> & EditorNavProps) {
  const displayValue = String(row[column.key] ?? '').replace(/<br>/gi, '\n');
  const closedRef = useRef(false);
  const valueRef = useRef(displayValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 最初の onChange が「開幕 Enter の default action による \n 混入」かチェックするフラグ
  const firstChangeDoneRef = useRef(false);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    firstChangeDoneRef.current = false; // StrictMode 再実行でもリセット
    const blockEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.altKey) e.preventDefault();
    };
    el.addEventListener('keydown', blockEnter);
    el.focus();
    // microtask は default action より前に動くため、カーソル位置のセットに使う。
    // \n が末尾に挿入されることを保証することで onChange 側の検出を確実にする。
    queueMicrotask(() => {
      if (closedRef.current) return;
      console.log('[M] microtask. el.value before:', JSON.stringify(el.value), 'displayValue:', JSON.stringify(displayValue));
      el.value = displayValue;
      valueRef.current = displayValue;
      el.setSelectionRange(displayValue.length, displayValue.length);
      console.log('[M] microtask done. el.value:', JSON.stringify(el.value));
    });
    return () => el.removeEventListener('keydown', blockEnter);
  }, []);

  const rowIdx = Number(row._rowIndex);

  const navigate = (direction: 'up' | 'down' | 'left' | 'right') => {
    setTimeout(() => {
      const grid = gridRef.current;
      if (!grid) return;
      let nextRowIdx = rowIdx;
      let nextColIdx = colIdx;
      if (direction === 'down') {
        nextRowIdx = Math.min(rowIdx + 1, rowCount - 1);
      } else if (direction === 'up') {
        nextRowIdx = Math.max(rowIdx - 1, 0);
      } else if (direction === 'right') {
        if (colIdx < colCount - 1) { nextColIdx = colIdx + 1; }
        else if (rowIdx < rowCount - 1) { nextColIdx = 0; nextRowIdx = rowIdx + 1; }
      } else {
        if (colIdx > 0) { nextColIdx = colIdx - 1; }
        else if (rowIdx > 0) { nextColIdx = colCount - 1; nextRowIdx = rowIdx - 1; }
      }
      grid.selectCell({ idx: nextColIdx, rowIdx: nextRowIdx });
      onNavigated(nextRowIdx);
    }, 0);
  };

  const commit = (rawValue: string, direction?: 'up' | 'down' | 'left' | 'right') => {
    if (closedRef.current) return;
    console.log('[M] commit:', JSON.stringify(rawValue), direction);
    closedRef.current = true;
    const stored = rawValue.replace(/\n/g, '<br>');
    onRowChange({ ...row, [column.key]: stored }, true);
    onClose(true);
    if (direction) navigate(direction);
  };

  return (
    <textarea
      ref={textareaRef}
      className="w-full h-full resize-none px-2 py-1 text-sm font-mono leading-tight bg-slate-900 text-slate-200 outline-none border-2 border-cyan-400 box-border"
      defaultValue={displayValue}
      onChange={(e) => {
        const matched = e.target.value === valueRef.current + '\n';
        console.log('[M] onChange firstDone:', firstChangeDoneRef.current, 'matched:', matched, 'val:', JSON.stringify(e.target.value), 'valueRef:', JSON.stringify(valueRef.current));
        if (!firstChangeDoneRef.current) {
          firstChangeDoneRef.current = true;
          if (matched) {
            e.target.value = valueRef.current;
            e.target.setSelectionRange(valueRef.current.length, valueRef.current.length);
            console.log('[M] onChange: reverted accidental \\n');
            return;
          }
        }
        valueRef.current = e.target.value;
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const el = e.currentTarget;
          const start = el.selectionStart ?? el.value.length;
          const end = el.selectionEnd ?? el.value.length;
          el.value = el.value.substring(0, start) + '\n' + el.value.substring(end);
          el.selectionStart = el.selectionEnd = start + 1;
          valueRef.current = el.value;
          console.log('[M] Alt+Enter inserted. valueRef:', JSON.stringify(valueRef.current));
        } else if (e.key === 'Enter') {
          e.stopPropagation();
          console.log('[M] Enter keydown shift:', e.shiftKey, 'valueRef:', JSON.stringify(valueRef.current));
          commit(valueRef.current, e.shiftKey ? 'up' : 'down');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          commit(valueRef.current, e.shiftKey ? 'left' : 'right');
        } else if (e.key === 'Escape') {
          closedRef.current = true;
          onClose(false);
        }
      }}
      onBlur={(e) => {
        commit(e.target.value);
      }}
    />
  );
}

// ---------- ヘッダーセル編集 ----------

function EditableHeader({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  if (!editing) {
    return (
      <div
        className="flex items-center h-full px-1 font-semibold text-sm cursor-text select-none w-full"
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        title="ダブルクリックで編集"
      >
        {value || <span className="text-slate-600 italic text-xs">（列名）</span>}
      </div>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { onCommit(draft); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { onCommit(draft); setEditing(false); }
        if (e.key === 'Escape') { setEditing(false); }
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-full h-full bg-transparent font-semibold text-sm font-mono outline-none border-b-2 border-cyan-400 px-1"
    />
  );
}

// ---------- ツールバー ----------

interface ToolbarProps {
  tableId: string;
  selectedRow: number | null;
  rowCount: number;
}

function GridToolbar({ tableId, selectedRow, rowCount }: ToolbarProps) {
  const { addRow, deleteRow, moveRow } = useAppStore();

  const canDelete = selectedRow !== null;
  const canMoveUp = selectedRow !== null && selectedRow > 0;
  const canMoveDown = selectedRow !== null && selectedRow < rowCount - 1;

  const iconBtn = (enabled: boolean) =>
    `p-1.5 rounded transition-colors ${enabled ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-700 cursor-not-allowed'}`;

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-900 border-b border-slate-800 flex-shrink-0">
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 rounded hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-700 transition-all"
        onClick={() => addRow(tableId, selectedRow ?? undefined)}
        title={selectedRow !== null ? '選択行の下に行を追加' : '末尾に行を追加'}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        行を追加
      </button>
      <button
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-transparent transition-all ${canDelete ? 'text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' : 'text-slate-600 cursor-not-allowed'}`}
        disabled={!canDelete}
        onClick={() => selectedRow !== null && deleteRow(tableId, selectedRow)}
        title="選択行を削除"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        行を削除
      </button>
      <div className="w-px h-4 bg-slate-700 mx-1" />
      <button
        className={iconBtn(canMoveUp)}
        disabled={!canMoveUp}
        onClick={() => selectedRow !== null && moveRow(tableId, selectedRow, selectedRow - 1)}
        title="上に移動 (Alt+↑)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        className={iconBtn(canMoveDown)}
        disabled={!canMoveDown}
        onClick={() => selectedRow !== null && moveRow(tableId, selectedRow, selectedRow + 1)}
        title="下に移動 (Alt+↓)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}

// ---------- メイングリッド ----------

export function TableGrid() {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const { tables, activeTableIndex, edits, commitEdit, moveRow } = useAppStore();
  const gridRef = useRef<DataGridHandle>(null);
  const table = tables[activeTableIndex];

  // テーブル切り替え時に選択リセット
  useEffect(() => { setSelectedRow(null); }, [activeTableIndex]);

  if (!table) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-700 text-sm font-mono">
        テーブルを選択してください
      </div>
    );
  }

  const edit = edits[table.id];
  if (!edit) return null;

  const { headerRow, dataRows } = edit;

  const columns: Column<RowData>[] = headerRow.map((header, idx) => ({
    key: `col_${idx}`,
    name: header,
    resizable: true,
    editable: true,
    renderCell: ({ row }: RenderCellProps<RowData>) => {
      const raw = String(row[`col_${idx}`] ?? '');
      const parts = raw.split(/<br>/i);
      return (
        <div className="px-2 py-1 text-sm w-full overflow-hidden" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
          {parts.map((part, i) => <span key={i}>{i > 0 && <br />}{part}</span>)}
        </div>
      );
    },
    renderEditCell: (props: RenderEditCellProps<RowData>) => (
      <MultilineEditor
        {...props}
        gridRef={gridRef}
        colIdx={idx}
        colCount={headerRow.length}
        rowCount={dataRows.length}
        onNavigated={setSelectedRow}
      />
    ),
    renderHeaderCell: () => (
      <EditableHeader
        value={header}
        onCommit={(v) => {
          const newHeader = [...headerRow];
          newHeader[idx] = v;
          commitEdit(table.id, newHeader, dataRows);
        }}
      />
    ),
  }));

  const rows: RowData[] = dataRows.map((row, rowIndex) => ({
    _rowIndex: rowIndex,
    ...Object.fromEntries(row.map((cell, colIdx) => [`col_${colIdx}`, cell])),
  }));

  function handleRowsChange(newRows: RowData[]) {
    const newDataRows = newRows.map((row: RowData) =>
      headerRow.map((_, idx) => String(row[`col_${idx}`] ?? ''))
    );
    commitEdit(table.id, headerRow, newDataRows);
  }

  return (
    <div
      className="flex-1 min-w-0 flex flex-col overflow-hidden p-3 bg-slate-950"
      onKeyDown={(e) => {
        // Alt+↑↓ で行移動
        if (!e.altKey || selectedRow === null) return;
        if (e.key === 'ArrowUp' && selectedRow > 0) {
          e.preventDefault();
          moveRow(table.id, selectedRow, selectedRow - 1);
          setSelectedRow(selectedRow - 1);
        } else if (e.key === 'ArrowDown' && selectedRow < dataRows.length - 1) {
          e.preventDefault();
          moveRow(table.id, selectedRow, selectedRow + 1);
          setSelectedRow(selectedRow + 1);
        }
      }}
    >
      <div className="flex flex-col flex-1 min-h-0 border border-slate-700/50 rounded overflow-hidden">
        <GridToolbar tableId={table.id} selectedRow={selectedRow} rowCount={dataRows.length} />
        <DataGrid
          ref={gridRef}
          columns={columns}
          rows={rows}
          onRowsChange={handleRowsChange}
          rowKeyGetter={(row) => row._rowIndex}
          rowHeight={(row) => {
            const maxLines = headerRow.reduce((max, _, i) => {
              const val = String(row[`col_${i}`] ?? '');
              return Math.max(max, (val.match(/<br>/gi)?.length ?? 0) + 1);
            }, 1);
            return Math.max(35, maxLines * 24 + 10);
          }}
          onCellClick={({ rowIdx }) => setSelectedRow(rowIdx)}
          onCellKeyDown={(args, event) => {
            if (event.key === 'Enter') {
              event.preventGridDefault();
              const next = event.shiftKey
                ? Math.max(args.rowIdx - 1, 0)
                : Math.min(args.rowIdx + 1, dataRows.length - 1);
              if (args.mode === 'SELECT') args.selectCell({ idx: args.column.idx, rowIdx: next });
              setSelectedRow(next);
            } else if (event.key === 'F2') {
              event.preventGridDefault();
              gridRef.current?.selectCell({ idx: args.column.idx, rowIdx: args.rowIdx }, { enableEditor: true });
            } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
              // 文字キーでのエディター起動を禁止（F2・ダブルクリックのみで編集開始）
              event.preventGridDefault();
            }
          }}
          style={{ blockSize: '100%' }}
        />
      </div>
    </div>
  );
}
