// セットアップ確認用のサンプルテスト
// 実際のテストを書き始めたら削除してOK

describe("Vitest セットアップ確認", () => {
  test("1 + 1 = 2", () => {
    expect(1 + 1).toBe(2);
  });

  test("文字列の結合", () => {
    expect("Table" + "Draft").toBe("TableDraft");
  });
});
