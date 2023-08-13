import { Client, LogLevel } from "@notionhq/client";
import * as fs from "fs";

import { markdownToAst, astToMarkdown, createListAst, createHeadingAst } from "./lib/util.js";

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
}

const richTextExtractor = (value) => {
  return value[0]?.plain_text || "";
}

const selectExtractor = (value) => {
  console.dir(value, { depth: null })
  return value.name;
}

const numberExtractor = (value) => {
  return value;
}

const dateExtractor = (value) => {
  return value.start;
}

const valueMap = {
  type: selectExtractor,
  score: numberExtractor,
  from: selectExtractor,
  buy: richTextExtractor,
  Bad: richTextExtractor,
  Good: richTextExtractor,
  Y: richTextExtractor,
  W: richTextExtractor,
  T: richTextExtractor,
  meeting: numberExtractor,
  facilitate: numberExtractor,
  Topic: richTextExtractor,
  coffee: numberExtractor,
  FeedbackMemo: richTextExtractor,
  date: dateExtractor,
  topic: richTextExtractor,
  lunch: richTextExtractor,
  name: (title) => title[0].plain_text,
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

  const existMarkdown = fs.existsSync(obsidianDailyNoteFilename);
  if (!existMarkdown) {
    fs.writeFileSync(obsidianDailyNoteFilename, "");
  }
  const ast = markdownToAst(obsidianDailyNoteFilename);



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
            on_or_after: "2022-02-01",
          }
        },
        {
          property: "Date",
          date: {
            on_or_before: "2022-02-02"
          }
        }
      ]
    }
  });

  const pages = response.results;
  // console.dir(pages, { depth: null });

  pages.forEach(page => {
    const row = getProperties(page);
    console.log(row);
    mergeDailyNote(obsidianDailyNoteDir, row);
  });
};

main();
