import { create } from 'zustand';
import { ParsedTable, parseMarkdown, serializeTableToMarkdown } from '../core/parser';

interface TableEdit {
  headerRow: string[];
  dataRows: string[][];
}

interface AppStore {
  filePath: string | null;
  rawContent: string;
  tables: ParsedTable[];
  activeTableIndex: number;
  edits: Record<string, TableEdit>;
  undoStacks: Record<string, TableEdit[]>;
  redoStacks: Record<string, TableEdit[]>;
  isDirty: boolean;

  openFile: (filePath: string, content: string) => void;
  setActiveTable: (index: number) => void;
  commitEdit: (tableId: string, headerRow: string[], dataRows: string[][]) => void;
  undo: (tableId: string) => void;
  redo: (tableId: string) => void;
  addRow: (tableId: string, afterIndex?: number) => void;
  deleteRow: (tableId: string, rowIndex: number) => void;
  addColumn: (tableId: string) => void;
  deleteColumn: (tableId: string, colIndex: number) => void;
  moveRow: (tableId: string, fromIndex: number, toIndex: number) => void;
  getSaveContent: () => string;
  markSaved: () => void;
}

const MAX_UNDO = 50;

export const useAppStore = create<AppStore>((set, get) => ({
  filePath: null,
  rawContent: '',
  tables: [],
  activeTableIndex: 0,
  edits: {},
  undoStacks: {},
  redoStacks: {},
  isDirty: false,

  openFile: (filePath, content) => {
    const tables = parseMarkdown(content);
    const edits: Record<string, TableEdit> = {};
    for (const t of tables) {
      edits[t.id] = { headerRow: [...t.headerRow], dataRows: t.dataRows.map(r => [...r]) };
    }
    set({ filePath, rawContent: content, tables, edits, undoStacks: {}, redoStacks: {}, activeTableIndex: 0, isDirty: false });
  },

  setActiveTable: (index) => set({ activeTableIndex: index }),

  commitEdit: (tableId, headerRow, dataRows) => {
    const { edits, undoStacks, redoStacks } = get();
    const prev = edits[tableId];
    const prevStack = undoStacks[tableId] ?? [];
    set({
      edits: { ...edits, [tableId]: { headerRow, dataRows } },
      undoStacks: { ...undoStacks, [tableId]: [...prevStack.slice(-(MAX_UNDO - 1)), prev] },
      redoStacks: { ...redoStacks, [tableId]: [] },
      isDirty: true,
    });
  },

  undo: (tableId) => {
    const { edits, undoStacks, redoStacks } = get();
    const stack = undoStacks[tableId] ?? [];
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    const current = edits[tableId];
    set({
      edits: { ...edits, [tableId]: prev },
      undoStacks: { ...undoStacks, [tableId]: stack.slice(0, -1) },
      redoStacks: { ...redoStacks, [tableId]: [...(redoStacks[tableId] ?? []), current] },
      isDirty: true,
    });
  },

  redo: (tableId) => {
    const { edits, undoStacks, redoStacks } = get();
    const stack = redoStacks[tableId] ?? [];
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    const current = edits[tableId];
    set({
      edits: { ...edits, [tableId]: next },
      redoStacks: { ...redoStacks, [tableId]: stack.slice(0, -1) },
      undoStacks: { ...undoStacks, [tableId]: [...(undoStacks[tableId] ?? []), current] },
      isDirty: true,
    });
  },

  addRow: (tableId, afterIndex) => {
    const { edits } = get();
    const edit = edits[tableId];
    if (!edit) return;
    const newRow = Array(edit.headerRow.length).fill('') as string[];
    const rows = [...edit.dataRows];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : rows.length;
    rows.splice(insertAt, 0, newRow);
    get().commitEdit(tableId, edit.headerRow, rows);
  },

  deleteRow: (tableId, rowIndex) => {
    const { edits } = get();
    const edit = edits[tableId];
    if (!edit) return;
    get().commitEdit(tableId, edit.headerRow, edit.dataRows.filter((_, i) => i !== rowIndex));
  },

  addColumn: (tableId) => {
    const { edits } = get();
    const edit = edits[tableId];
    if (!edit) return;
    get().commitEdit(tableId, [...edit.headerRow, ''], edit.dataRows.map(r => [...r, '']));
  },

  deleteColumn: (tableId, colIndex) => {
    const { edits } = get();
    const edit = edits[tableId];
    if (!edit) return;
    get().commitEdit(
      tableId,
      edit.headerRow.filter((_, i) => i !== colIndex),
      edit.dataRows.map(r => r.filter((_, i) => i !== colIndex))
    );
  },

  moveRow: (tableId, fromIndex, toIndex) => {
    const { edits } = get();
    const edit = edits[tableId];
    if (!edit) return;
    const rows = [...edit.dataRows];
    const [moved] = rows.splice(fromIndex, 1);
    rows.splice(toIndex, 0, moved);
    get().commitEdit(tableId, edit.headerRow, rows);
  },

  getSaveContent: () => {
    const { rawContent, tables, edits } = get();
    let content = rawContent;
    // 末尾から処理することでオフセットのずれを防ぐ
    for (let i = tables.length - 1; i >= 0; i--) {
      const table = tables[i];
      const edit = edits[table.id];
      if (!edit) continue;
      const newMd = serializeTableToMarkdown(edit.headerRow, edit.dataRows);
      content = content.slice(0, table.startOffset) + newMd + content.slice(table.endOffset);
    }
    return content;
  },

  markSaved: () => set({ isDirty: false }),
}));
