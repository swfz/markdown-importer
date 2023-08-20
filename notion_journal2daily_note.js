import { Client, LogLevel } from "@notionhq/client";
import yaml from 'js-yaml';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear.js';
dayjs.extend(weekOfYear);

import * as fs from "fs";
import { parseString, createRecursiveListAst, markdownToAst, astToMarkdown, createHeadingAst, formatFeedbackMemo} from "./lib/util.js";

// 範囲: 2021-10-27 - 2022-12-30

const keyMap = {
  "📗Y": "Y",
  "📘W": "W",
  "📕T": "T",
  "買ったもの": "buy",
  "会議": "meeting",
  "ファシリ": "facilitate",
  "topic": "Topic",
  "コーヒー": "coffee",
  "FB用メモ": "FeedbackMemo",
  "Bad": "Bad",
  "Good": "Good",
  "Name": "title"
}

const richTextExtractor = (value) => {
  return value[0]?.plain_text || null;
}

const selectExtractor = (value) => {
  return value?.name || null;
}

const numberExtractor = (value) => {
  return value || 0;
}

const dateExtractor = (value) => {
  return value.start;
}

const valueMap = {
  date: dateExtractor,
  type: selectExtractor,
  from: selectExtractor,
  title: (title) => title[0]?.plain_text,
  lunch: richTextExtractor,
  score: numberExtractor,
  coffee: numberExtractor,
  facilitate: numberExtractor,
  meeting: numberExtractor,
  buy: richTextExtractor,
  Y: richTextExtractor,
  W: richTextExtractor,
  T: richTextExtractor,
  Good: richTextExtractor,
  Bad: richTextExtractor,
  FeedbackMemo: richTextExtractor,
  topic: richTextExtractor,
}

const getProperties = (page) => {
  const keys = Object.keys(page.properties);

  const properties = keys.reduce((acc, key) => {
    const property = page.properties[key];
    const propType = property.type;

    if (["relation", "formula"].includes(propType)) {
      return acc;
    }

    const name = keyMap[key] || key.toLowerCase()

    return {...acc, ...{[name]: valueMap[name](property[propType])}}
  }, {})

  return properties;
};

const mergeDailyNote = (directory, row) =>{
  const obsidianDailyNoteFilename = `${directory}/${row.date}.md`;
  console.log(row);

  const existMarkdown = fs.existsSync(obsidianDailyNoteFilename);
  if (!existMarkdown) {
    fs.writeFileSync(obsidianDailyNoteFilename, "");
  }
  const ast = markdownToAst(obsidianDailyNoteFilename);

  // 現存するファイルに関しては全て末尾に`tags: #daily/2022/03` がある
  const targetHeaderIndex = ast.children.findIndex(
    (node) => node.type === "paragraph" && node.children[0]?.value?.match('tags: #daily')
  );

  // 何かしら1つあれば1度実行したと判断
  if (ast.children.findIndex(node => node.type === "heading" && node.children[0]?.value === 'Y') !== -1){
    console.warn("already merged");
    return;
  }

  const contentsAstList = ["Y", "W", "T", "Good", "Bad", "FeedbackMemo", "Topic"].map(key => {
    if (!row[key]) {
      return [createHeadingAst(key, 2)];
    }

    const lines = key !== "FeedbackMemo" ? parseString(row[key]) : formatFeedbackMemo(row[key]);

    return [createHeadingAst(key, 2), createRecursiveListAst(lines)]
  }).flat();

  const mergedContentsChildren = targetHeaderIndex === -1 ? [
    ...ast.children,
    ...contentsAstList
  ] : [
    ...ast.children.slice(0, targetHeaderIndex),
    ...contentsAstList,
    ...ast.children.slice(targetHeaderIndex),
  ];

  const frontmatterIndex = mergedContentsChildren.findIndex(node => node.type === "yaml");
  const metadata = frontmatterIndex === -1 ? {} : yaml.load(mergedContentsChildren[frontmatterIndex].value, {schema: yaml.JSON_SCHEMA});

  const frontmatter = [
    "date", "type", "from", "title", "lunch", "score", "coffee", "facilitate", "meeting", "buy"
  ].reduce((acc, key) => {
    acc[key] = row[key];
    return acc;
  }, {
    ...metadata,
    week: `${dayjs(row.date).year()}-W${dayjs(row.date).week().toString().padStart(2, '0')}`,
    month: `${dayjs(row.date).format("YYYY-MM")}`,
  });

  const frontmatterAst = {
    type: "yaml",
    value: yaml.dump(frontmatter, {
      schema: yaml.JSON_SCHEMA,
      styles: {
        '!!null': 'empty'
      },
    }),
  }

  // frontmatterが無い場合は先頭に追加
  const children = frontmatterIndex === -1 ? [
    frontmatterAst,
    ...mergedContentsChildren,
  ] : [
    ...mergedContentsChildren.slice(0, frontmatterIndex),
    frontmatterAst,
    ...mergedContentsChildren.slice(frontmatterIndex + 1),
  ];

  const afterAst = { ...ast, ...{ children }};
  // console.dir(removePositionFromAst(afterAst), {depth: null});

  astToMarkdown(obsidianDailyNoteFilename, afterAst);
}

const main = async () => {
  const args = process.argv.slice(2);

  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    logLevel: LogLevel.DEBUG,
  });

  const databaseId = process.env.NOTION_DATABASE_ID || "";
  const obsidianDailyNoteDir = args[0];

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: "Date",
          date: {
            on_or_after: "2022-12-01",
          }
        },
        {
          property: "Date",
          date: {
            on_or_before: "2022-12-31"
          }
        }
      ]
    }
  });

  const pages = response.results;

  pages.forEach(page => {
    const row = getProperties(page);
    mergeDailyNote(obsidianDailyNoteDir, row);
  });
};

main();
