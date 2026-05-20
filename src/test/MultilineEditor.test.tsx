import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultilineEditor } from '../components/TableGrid';
import type { Column } from 'react-data-grid';

// ---------------------------------------------------------------------------
// テスト用ヘルパー
// ---------------------------------------------------------------------------

type RowData = { _rowIndex: number; [key: string]: string | number };

function setup(initialValue = '') {
  const row: RowData = { _rowIndex: 0, col_0: initialValue };
  const column = { key: 'col_0', name: 'テスト列' } as Column<RowData>;
  const onRowChange = vi.fn();
  const onClose = vi.fn();
  // gridRef は navigate() 内で null チェックされるため null で問題ない
  const gridRef = { current: null } as React.RefObject<import('react-data-grid').DataGridHandle | null>;

  render(
    <MultilineEditor
      row={row}
      column={column}
      onRowChange={onRowChange}
      onClose={onClose}
      gridRef={gridRef}
      colIdx={0}
      colCount={3}
      rowCount={5}
    />
  );

  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
  return { textarea, onRowChange, onClose };
}

// ---------------------------------------------------------------------------

describe('MultilineEditor / Enter キー', () => {
  test('Enter → onClose(true) が呼ばれる（確定）', async () => {
    const { textarea, onClose } = setup('値');
    await userEvent.type(textarea, '{Enter}');
    expect(onClose).toHaveBeenCalledWith(true);
  });

  test('Enter → onClose は commitChanges=false では呼ばれない', async () => {
    const { textarea, onClose } = setup('値');
    await userEvent.type(textarea, '{Enter}');
    expect(onClose).not.toHaveBeenCalledWith(false);
  });

  test('Enter → onKeyDown 時点の値（\\n 混入前）で保存される', async () => {
    const { textarea, onRowChange } = setup('テスト');
    // userEvent.type は onChange を経由するので valueRef が正しく更新される
    await userEvent.type(textarea, '{Enter}');
    expect(onRowChange).toHaveBeenCalledWith(
      expect.objectContaining({ col_0: 'テスト' }),
      true
    );
  });

  // ===== 現在バグあり =====
  // Alt+Enter: コメントには「textareaが改行を挿入する」とあるが、
  // textarea は Alt+Enter で自動改行しない。何も起きない。
  test('Alt+Enter → テキストに \\n が挿入される（現在バグあり）', async () => {
    const { textarea } = setup('行1');

    // カーソルを末尾に
    textarea.setSelectionRange(2, 2);
    await userEvent.keyboard('{Alt>}{Enter}{/Alt}');

    expect(textarea.value).toBe('行1\n');
  });

  // Shift+Enter: navigate('up') で上移動を指示し、onClose(true) で確定
  test('Shift+Enter → onClose(true) が呼ばれる（確定）', async () => {
    const { textarea, onClose } = setup('値');
    await userEvent.type(textarea, '{Shift>}{Enter}{/Shift}');
    expect(onClose).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------

describe('MultilineEditor / Tab キー', () => {
  test('Tab → onClose(true) が呼ばれる（確定）', async () => {
    const { textarea, onClose } = setup('値');
    await userEvent.type(textarea, '{Tab}');
    expect(onClose).toHaveBeenCalledWith(true);
  });
});

// ---------------------------------------------------------------------------

describe('MultilineEditor / Escape キー', () => {
  test('Escape → onClose(false) が呼ばれる（キャンセル）', async () => {
    const { textarea, onClose } = setup('元の値');
    await userEvent.type(textarea, '変更途中');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith(false);
  });

  test('Escape → onRowChange は呼ばれない', async () => {
    const { textarea, onRowChange } = setup('元の値');
    await userEvent.type(textarea, '変更途中');
    await userEvent.keyboard('{Escape}');
    expect(onRowChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------

describe('MultilineEditor / セル値の保存', () => {
  test('編集した値が onRowChange に渡される', async () => {
    const { textarea, onRowChange } = setup('');
    await userEvent.type(textarea, 'こんにちは');
    await userEvent.type(textarea, '{Enter}');
    expect(onRowChange).toHaveBeenCalledWith(
      expect.objectContaining({ col_0: 'こんにちは' }),
      true
    );
  });

  test('既存の <br> は編集中に \\n として表示される', () => {
    const { textarea } = setup('行1<br>行2');
    expect(textarea.value).toBe('行1\n行2');
  });

  test('\\n を含む値は <br> に変換されて保存される', async () => {
    const { textarea, onRowChange } = setup('行1\n行2');
    await userEvent.type(textarea, '{Enter}');
    expect(onRowChange).toHaveBeenCalledWith(
      expect.objectContaining({ col_0: '行1<br>行2' }),
      true
    );
  });
});
