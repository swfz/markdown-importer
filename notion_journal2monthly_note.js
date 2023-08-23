import { Client, LogLevel } from "@notionhq/client";
import dayjs from 'dayjs';

import * as fs from "fs";
import { parseString, createRecursiveListAst, markdownToAst, astToMarkdown, createHeadingAst } from "./lib/util.js";

// NOTE: Notionにある期間はObsidianには無いので全てファイル新規作成
// 期間: 2021-10-01 ~ 2022-12-31

const keyMap = {
  "仕事": "仕事",
  "個人OKRの進捗": "個人OKR",
  "勉強": "勉強",
  "月1目標": "月1目標",
  "次月意識すること": "次月意識すること",
  "K": "K",
  "P": "P",
  "T": "T",
}

const richTextExtractor = (value) => {
  return value.map(v => v.plain_text).join("").trim() || null;
}

const valueMap = {
  term: (value) => value,
  month: (value) => value,
  仕事: richTextExtractor,
  個人OKR: richTextExtractor,
  勉強: richTextExtractor,
  月1目標: richTextExtractor,
  次月意識すること: richTextExtractor,
  K: richTextExtractor,
  P: richTextExtractor,
  T: richTextExtractor,
}

const getProperties = (page) => {
  const keys = Object.keys(page.properties);

  const properties = keys.reduce((acc, key) => {
    const property = page.properties[key];
    const propType = property.type;

    if (["relation", "formula", "rollup"].includes(propType) || ["Now", "Name"].includes(key)) {
      return acc;
    }

    const name = keyMap[key] || key.toLowerCase()

    return {...acc, ...{[name]: valueMap[name](property[propType])}}
  }, {})

  return properties;
};

const mergeMonthlyNote = (directory, row) => {
  const filename = `${directory}/${dayjs(row.term.start).format("YYYY-MM")}.md`;

  const existMarkdown = fs.existsSync(filename);
  if (!existMarkdown) {
    fs.writeFileSync(filename, "");
  }
  const ast = markdownToAst(filename);

  const contentsAstList = ["仕事", "個人OKR", "勉強", "月1目標", "次月意識すること", "K", "P", "T"].map(key => {
    if (!row[key]) {
      return [createHeadingAst(key, 2)];
    }

    const lines = parseString(row[key]);

    return [createHeadingAst(key, 2), createRecursiveListAst(lines)]
  }).flat();

  const children = [
    ...contentsAstList
  ];

  const afterAst = { ...ast, ...{ children }};
  astToMarkdown(filename, afterAst);
}

const main = async () => {
  const args = process.argv.slice(2);

  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    logLevel: LogLevel.DEBUG,
  });

  const databaseId = process.env.NOTION_DATABASE_ID || "";
  const obsidianMonthlyNoteDir = args[0];

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  const pages = response.results;

  pages.forEach(page => {
    const row = getProperties(page);
    console.info(`writing... ${row?.term?.start}`);
    mergeMonthlyNote(obsidianMonthlyNoteDir, row);
  });
};

main();