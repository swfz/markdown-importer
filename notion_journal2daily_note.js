import { Client, LogLevel } from "@notionhq/client";
import * as fs from "fs";

import { markdownToAst, astToMarkdown, createListAst, createHeadingAst } from "./lib/util.js";

const keyMap = {
  "📗Y": "Y",
}

const getProperties = async (page) => {
  console.dir(page, { depth: null });
  const entries = Object.entries(page.properties);
  // console.log(entries);
  const keys = Object.keys(page.properties);

  // console.log(keys);
  const properties = keys.map((key) => {
    const property = page.properties[key];
    const propType = property.type;

    if (["relation", "formula"].includes(propType)) {
      return null;
    }

// console.log(property);
// console.log(propType);
// console.log(property[propType]);

    return {
      name: key,
      value: property[propType],
    };
  })
  .filter((p) => p);

  return properties;
};

// nestしたリストの作成
// a
// → b
// みたいなことやってるのでこれをリスト化する
// 項目のマップ
// 絵文字+Y -> Y
// FB用メモ

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
            on_or_before: "2022-02-08"
          }
        }
      ]
    }
  });

  const pages = response.results;
  // console.dir(pages, { depth: null });

  console.log(pages.map(p => p.properties.Name.title[0]?.plain_text));

  // ==== 1件で試す
  // const properties = await getProperties(pages[0]);
  // console.dir(properties, { depth: null });
  // await mergeDailyNote(obsidianDailyNoteDir, properties);
  // ==== 1件で試す

};

main();
