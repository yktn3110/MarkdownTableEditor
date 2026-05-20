import { parseMarkdown, serializeTableToMarkdown } from "../core/parser";

// ---------------------------------------------------------------------------
// テスト用Markdownスニペット
// ---------------------------------------------------------------------------

const SIMPLE_3COL_2ROW = [
  "| 名前 | 役割 | 担当 |",
  "|------|------|------|",
  "| 田中 | PM   | 要件定義 |",
  "| 佐藤 | Dev  | 実装 |",
].join("\n");

// ---------------------------------------------------------------------------
// parseMarkdown
// ---------------------------------------------------------------------------

describe("parseMarkdown / 基本", () => {
  test("#1 単純な3列2行テーブル", () => {
    const result = parseMarkdown(SIMPLE_3COL_2ROW);

    expect(result).toHaveLength(1);
    expect(result[0].headerRow).toEqual(["名前", "役割", "担当"]);
    expect(result[0].dataRows).toHaveLength(2);
    expect(result[0].dataRows[0]).toEqual(["田中", "PM", "要件定義"]);
    expect(result[0].dataRows[1]).toEqual(["佐藤", "Dev", "実装"]);
  });

  test("#2 テーブルが複数ある → 配列として順番通りに返す", () => {
    const md = [
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "| C | D |",
      "|---|---|",
      "| 3 | 4 |",
    ].join("\n");

    const result = parseMarkdown(md);

    expect(result).toHaveLength(2);
    expect(result[0].headerRow).toEqual(["A", "B"]);
    expect(result[1].headerRow).toEqual(["C", "D"]);
  });

  test("#3 直前に見出しがある → name = 見出しテキスト", () => {
    const md = [
      "## スケジュール",
      "",
      "| 日付 | 内容 |",
      "|------|------|",
      "| 5/1  | 開始 |",
    ].join("\n");

    const result = parseMarkdown(md);

    expect(result[0].name).toBe("スケジュール");
  });

  test("#4 見出しなし・1つ目のテーブル → name = 'Table 1'", () => {
    const result = parseMarkdown(SIMPLE_3COL_2ROW);

    expect(result[0].name).toBe("Table 1");
  });

  test("#5 見出しなし・複数テーブル → 'Table 1', 'Table 2', ...", () => {
    const md = [
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "| C | D |",
      "|---|---|",
      "| 3 | 4 |",
    ].join("\n");

    const result = parseMarkdown(md);

    expect(result[0].name).toBe("Table 1");
    expect(result[1].name).toBe("Table 2");
  });

  test("#6 見出しとテーブルの間に段落がある → 直前の見出しが引き継がれる", () => {
    const md = [
      "## メンバー",
      "",
      "ここに説明文があります。",
      "",
      "| 名前 | 役割 |",
      "|------|------|",
      "| 田中 | PM   |",
    ].join("\n");

    const result = parseMarkdown(md);

    expect(result[0].name).toBe("メンバー");
  });
});

// ---------------------------------------------------------------------------

describe("parseMarkdown / セル内容", () => {
  test("#7 通常テキスト → そのまま返す", () => {
    const md = "| 内容 |\n|---|\n| 通常テキスト |";

    const result = parseMarkdown(md);

    expect(result[0].dataRows[0][0]).toBe("通常テキスト");
  });

  test("#8 <br> を含むセル → \\n に変換", () => {
    const md = "| 内容 |\n|---|\n| 行1<br>行2 |";

    const result = parseMarkdown(md);

    expect(result[0].dataRows[0][0]).toBe("行1\n行2");
  });

  test("#9 <br/> を含むセル → \\n に変換", () => {
    const md = "| 内容 |\n|---|\n| 行1<br/>行2 |";

    const result = parseMarkdown(md);

    expect(result[0].dataRows[0][0]).toBe("行1\n行2");
  });

  // remark がエスケープをどう処理するか実装確認が必要
  test.todo("#10 エスケープされた \\| → \"|\" になる（remark の挙動次第・要確認）");

  test("#11 インラインコード `code` → バッククォートごと返す", () => {
    const md = "| 内容 |\n|---|\n| `code` |";

    const result = parseMarkdown(md);

    expect(result[0].dataRows[0][0]).toBe("`code`");
  });

  test("#12 空セル → 空文字", () => {
    const md = "| A | B |\n|---|---|\n|   |   |";

    const result = parseMarkdown(md);

    expect(result[0].dataRows[0][0]).toBe("");
    expect(result[0].dataRows[0][1]).toBe("");
  });
});

// ---------------------------------------------------------------------------

describe("parseMarkdown / オフセット", () => {
  test("#18 startOffset の位置からテーブル先頭行（|）が始まる", () => {
    const content = "前のテキスト\n\n| A | B |\n|---|---|\n| 1 | 2 |";

    const result = parseMarkdown(content);

    expect(content[result[0].startOffset]).toBe("|");
  });

  test("#19 content.slice(startOffset, endOffset) がテーブル全体と一致する", () => {
    const tableStr = "| A | B |\n|---|---|\n| 1 | 2 |";
    const content = `前のテキスト\n\n${tableStr}\n\n後のテキスト`;

    const result = parseMarkdown(content);

    expect(content.slice(result[0].startOffset, result[0].endOffset)).toBe(tableStr);
  });

  test("#20 複数テーブルのオフセットが重複しない", () => {
    const md = "| A |\n|---|\n| 1 |\n\n| B |\n|---|\n| 2 |";

    const result = parseMarkdown(md);

    expect(result[0].endOffset).toBeLessThanOrEqual(result[1].startOffset);
  });
});

// ---------------------------------------------------------------------------
// serializeTableToMarkdown
// ---------------------------------------------------------------------------

describe("serializeTableToMarkdown", () => {
  test("#21 通常テキストのセル → そのまま出力", () => {
    const result = serializeTableToMarkdown(["名前"], [["田中"]]);

    expect(result).toContain("田中");
  });

  test("#22 \\n を含むセル値 → <br> に変換して出力", () => {
    const result = serializeTableToMarkdown(["内容"], [["行1\n行2"]]);

    expect(result).toContain("行1<br>行2");
  });

  test("#23 | を含むセル値 → \\| にエスケープして出力", () => {
    const result = serializeTableToMarkdown(["内容"], [["A|B"]]);

    expect(result).toContain("A\\|B");
  });

  test("#24 区切り行がすべて --- になる", () => {
    const result = serializeTableToMarkdown(["A", "B", "C"], [["1", "2", "3"]]);

    const separator = result.trim().split("\n")[1];
    expect(separator).toMatch(/^\|(\s---\s\|)+$/);
  });

  test("#25 3列2行のテーブルが正しい行数で出力される", () => {
    const result = serializeTableToMarkdown(
      ["名前", "役割", "担当"],
      [
        ["田中", "PM", "要件定義"],
        ["佐藤", "Dev", "実装"],
      ]
    );

    const lines = result.trim().split("\n");
    // ヘッダー行 + 区切り行 + データ2行 = 4行
    expect(lines).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 往復テスト（parse → serialize → parse）
// ---------------------------------------------------------------------------

describe("往復テスト（parse → serialize → parse）", () => {
  const SOURCE_MD = "| 名前 | 役割 |\n|---|---|\n| 田中 | PM |";

  let original: ReturnType<typeof parseMarkdown>[0];
  let roundTripped: ReturnType<typeof parseMarkdown>[0];

  beforeAll(() => {
    original = parseMarkdown(SOURCE_MD)[0];
    const serialized = serializeTableToMarkdown(
      original.headerRow,
      original.dataRows
    );
    roundTripped = parseMarkdown(serialized)[0];
  });

  test("#26 headerRow が一致する", () => {
    expect(roundTripped.headerRow).toEqual(original.headerRow);
  });

  test("#27 dataRows が一致する", () => {
    expect(roundTripped.dataRows).toEqual(original.dataRows);
  });
});
