import { Client, LogLevel } from "@notionhq/client";
import yaml from 'js-yaml';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/isoWeek.js';
dayjs.extend(isoWeek);

import * as fs from "fs";
import { createRecursiveListAst, markdownToAst, astToMarkdown, createHeadingAst } from "./lib/util.js";

// NOTE: Notionにある期間はObsidianには無いので全てファイル新規作成

const keyMap = {
  "Week": "term",
  "仕事": "仕事",
  "Private": "Private",
  "気づき（感情）": "気づき",
  "次週Try": "次週Try",
}

const richTextExtractor = (value) => {
  return value.map(v => v.plain_text).join("").trim() || null;
}

const valueMap = {
  term: (value) => value,
  仕事: richTextExtractor,
  Private: richTextExtractor,
  気づき: richTextExtractor,
  次週Try: richTextExtractor,
}

const headList = [
  {contentsKey: "work_okr", key: "🎡", h2: "仕事", h3: "個人OKR" },
  {contentsKey: "work_other", key: "🎲", h2: "仕事", h3: "他" },
  {contentsKey: "private_objective", key: "🏳‍🌈", h2: "Private", h3: "月1目標" },
  {contentsKey: "private_other", key: "🧱", h2: "Private", h3: "他" },
  {contentsKey: "insight", key: "📈", h2: "気づき" },
  {contentsKey: "insight", key: "📉", h2: "気づき" },
  {contentsKey: "try_work", key: "💻", h2: "次週Try", h3: "仕事" },
  {contentsKey: "try_private", key: "🧩", h2: "次週Try", h3: "Private" },
];

const headers = [
  {value: "仕事", depth: 2},
  {value: "個人OKR", depth: 3, contentsKey: 'work_okr'},
  {value: "他", depth: 3, contentsKey: 'work_other'},
  {value: "Private", depth: 2},
  {value: "月1目標", depth: 3, contentsKey: 'private_objective'},
  {value: "他", depth: 3, contentsKey: 'private_other'},
  {value: "気づき", depth: 2, contentsKey: 'insight'},
  {value: "次週Try", depth: 2},
  {value: "仕事", depth: 3, contentsKey: 'try_work'},
  {value: "Private", depth: 3, contentsKey: 'try_private'},
]

const getFilename = (date) => {
  return `${dayjs(date).year()}-W${dayjs(date).isoWeek().toString().padStart(2, '0')}.md`
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

const pictgraphs = headList.map(h => h.key);
const getText = (lines, index, stack = []) => {
  const line = lines[index];

  if (line === undefined) {
    return stack;
  }

  if (pictgraphs.some(p => line.match(p))) {
    return stack;
  }
  else {
    stack.push({text: line});
    return getText(lines, index + 1, stack);
  }
}

const removePictgraph = (str) => {
  return pictgraphs.reduce((acc, pictgraph) => acc.replace(pictgraph, ""), str).trim();
}

const divisionGuranularity = (str) => {
  if (str === null) {
    return {};
  }

  const lines = str.split("\n");
  const listByName = lines.reduce((acc, line, index) => {
    if (pictgraphs.some(p => line.match(p)))  {
      const pictgraph = pictgraphs.find(p => line.match(p));
      const contentsKey = headList.find(h => h.key == pictgraph)?.contentsKey;

      const text = contentsKey === 'insight' ? [{text: removePictgraph(line)}] : getText(lines, index + 1);
      acc[contentsKey] = [...(acc[contentsKey] || []), ...text]
    }

    return acc;
  }, {});

  return listByName;
}

const mergeWeeklyNote = (directory, row) => {
  const filename = `${directory}/${getFilename(row.term.end)}`;

  const existMarkdown = fs.existsSync(filename);
  if (!existMarkdown) {
    fs.writeFileSync(filename, "");
  }
  const ast = markdownToAst(filename);

  // 各Rowの項目をContentsKeyの粒度に分割
  const contentsByKey = ["仕事", "Private", "気づき", "次週Try"].reduce((acc, key) => {
    return {...acc, ...divisionGuranularity(row[key])}
  }, {});

  const contentsAstList = headers.map(header => {
    if (header.contentsKey) {
      return [
        createHeadingAst(header.value, header.depth),
        createRecursiveListAst(contentsByKey[header.contentsKey] || [])
      ];
    }
    else {
      return [createHeadingAst(header.value, header.depth)];
    }
  }).flat();

  const frontmatter = {
    term: `${row.term.start} ~ ${row.term.end}`
  };

  const frontmatterAst = {
    type: "yaml",
    value: yaml.dump(frontmatter, {
      schema: yaml.JSON_SCHEMA,
      styles: {
        '!!null': 'empty'
      },
    }),
  }

  const children = [
    frontmatterAst,
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
  const obsidianWeeklyNoteDir = args[0];

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  const pages = response.results;

  pages.forEach(page => {
    const row = getProperties(page);
    console.info(`writing... ${row?.term?.start}`);
    mergeWeeklyNote(obsidianWeeklyNoteDir, row);
  });
};

main();