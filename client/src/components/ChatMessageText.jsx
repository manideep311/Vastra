import { Fragment } from 'react';

// Chat models often answer in light Markdown. Bold text, bullet lists and
// headings become elements (never raw HTML, so model output can't inject
// markup); tables, which don't fit the narrow chat window, become one bullet
// per row. Everything else stays plain text.

// **bold** and *italic* (the asterisks must hug the text, so "5 * 3" stays as is).
const renderInline = (text) =>
  text.split(/(\*\*[^*\n]+\*\*|\*(?!\s)[^*\n]+?(?<!\s)\*)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const isTableDivider = (line) => /^[\s|:-]+$/.test(line) && line.includes('-');
const tableCells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());

// "| Name | Price |" rows become "**Name** · Price: 340" bullet items.
const tableToItems = (rows) => {
  const [header = [], ...body] = rows.filter((row) => !isTableDivider(row)).map(tableCells);
  return body.map((cells) =>
    [
      `**${cells[0]}**`,
      ...cells.slice(1).map((cell, i) => (cell && cell !== '—' && cell !== '-' ? (header[i + 1] ? `${header[i + 1]}: ${cell}` : cell) : '')),
    ]
      .filter(Boolean)
      .join(' · ')
  );
};

const toBlocks = (text) => {
  const blocks = [];
  let list = null;
  let tableRows = null;

  const flushTable = () => {
    if (tableRows) blocks.push({ list: tableToItems(tableRows) });
    tableRows = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (isTableRow(line)) {
      list = null;
      tableRows = tableRows || [];
      tableRows.push(line);
      continue;
    }
    flushTable();

    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      if (!list) {
        list = [];
        blocks.push({ list });
      }
      list.push(bullet[1]);
      continue;
    }
    list = null;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    blocks.push(heading ? { heading: heading[1] } : { line });
  }
  flushTable();
  // Lists bring their own spacing, so blank lines next to them are dropped.
  return blocks.filter((block, i) => block.line !== '' || !(blocks[i - 1]?.list || blocks[i + 1]?.list));
};

function ChatMessageText({ text }) {
  const blocks = toBlocks(text);

  return blocks.map((block, i) => {
    const isLast = i === blocks.length - 1 || Boolean(blocks[i + 1].list);
    if (block.list) {
      return (
        <ul key={i} className="my-1 list-disc space-y-0.5 pl-5">
          {block.list.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    }
    if (block.heading !== undefined) {
      return (
        <Fragment key={i}>
          <strong>{renderInline(block.heading)}</strong>
          {!isLast && '\n'}
        </Fragment>
      );
    }
    return (
      <Fragment key={i}>
        {renderInline(block.line)}
        {!isLast && '\n'}
      </Fragment>
    );
  });
}

export default ChatMessageText;
