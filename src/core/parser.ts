import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Root, Table, TableRow, TableCell, Heading, Text, Html, InlineCode } from 'mdast';

export interface ParsedTable {
  id: string;
  name: string;
  headerRow: string[];
  dataRows: string[][];
  startOffset: number;
  endOffset: number;
}

const processor = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdown(content: string): ParsedTable[] {
  const tree = processor.parse(content) as Root;
  const tables: ParsedTable[] = [];
  let tableCount = 0;
  let lastHeading = '';

  for (const node of tree.children) {
    if (node.type === 'heading') {
      lastHeading = extractNodeText(node as Heading);
    } else if (node.type === 'table') {
      const tableNode = node as Table;
      const [headerRowNode, ...dataRowNodes] = tableNode.children;

      tables.push({
        id: `table-${tableCount}`,
        name: lastHeading || `Table ${tableCount + 1}`,
        headerRow: extractRow(headerRowNode),
        dataRows: dataRowNodes.map(extractRow),
        startOffset: tableNode.position!.start.offset!,
        endOffset: tableNode.position!.end.offset!,
      });
      tableCount++;
    }
  }

  return tables;
}

function extractRow(row: TableRow): string[] {
  return row.children.map(cell => extractCellText(cell as TableCell));
}

function extractCellText(cell: TableCell): string {
  const parts: string[] = [];
  visit(cell, (node) => {
    if (node.type === 'text') parts.push((node as Text).value);
    if (node.type === 'html') {
      const html = (node as Html).value.trim().toLowerCase();
      if (html === '<br>' || html === '<br/>') parts.push('<br>');
    }
    if (node.type === 'inlineCode') parts.push(`\`${(node as InlineCode).value}\``);
  });
  return parts.join('');
}

function extractNodeText(node: Heading): string {
  const parts: string[] = [];
  visit(node, 'text', (n: Text) => parts.push(n.value));
  return parts.join('');
}

export function serializeTableToMarkdown(
  headerRow: string[],
  dataRows: string[][]
): string {
  const escapeCell = (text: string) =>
    text.replace(/\|/g, '\\|').replace(/\n/g, '<br>');

  const toRow = (cells: string[]) =>
    '| ' + cells.map(escapeCell).join(' | ') + ' |';

  const sepRow = '| ' + Array(headerRow.length).fill('---').join(' | ') + ' |';

  return [toRow(headerRow), sepRow, ...dataRows.map(toRow)].join('\n');
}
