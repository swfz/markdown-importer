import { Client, LogLevel } from "@notionhq/client";
import * as fs from "fs";

import { markdownToAst, astToMarkdown, createListAst, createHeadingAst } from "./util.js";

const getHabitsFromPage = async (notion, page) => {
  const pageId = page.id;
  const response = await notion.pages.retrieve({ page_id: pageId });

  // console.log(response);
  const habitKeys = Object.keys(response.properties);

  const properties = habitKeys
    .map((key) => {
      const property = response.properties[key];
      const propType = property.type;

      if (["title", "relation", "formula", "select"].includes(propType)) {
        return null;
      }

      return {
        name: key,
        value: property[propType],
      };
    })
    .filter((p) => p);

  return properties;
};

const mergeDailyNote = async (directory, properties) => {
  const date = properties.find((p) => p.name === "date").value.start;
  const obsidianDailyNoteFilename = `${directory}/${date}.md`;

  const existMarkdown = fs.existsSync(obsidianDailyNoteFilename);
  if (!existMarkdown) {
    fs.writeFileSync(obsidianDailyNoteFilename, "");
  }

  const habits = properties.filter((p) => p.name !== "date");
  const ast = markdownToAst(obsidianDailyNoteFilename);

  const habitsAst = createListAst(habits, (row) => `[${row.value ? "x" : " "}] ${row.name}`);
  const habitsHeadingAst = createHabitsHeadingAst("Habits", 2);

  const existHabits = ast.children.find(
    (item) => item.type === "heading" && item.children[0]?.value === "Habits",
  );

  // すでに作成済みの場合は何もしない
  if (existHabits) {
    return;
  }

  const existMemoHeading = ast.children.find(
    (item) => item.type === "heading" && item.children[0]?.value === "Memo",
  );

  const insertBeforeMemo = (acc, item, i, array) => {
    if (
      array[i + 1]?.type === "heading" &&
      array[i + 1].children[0]?.value === "Memo"
    ) {
      return [...acc, item, habitsHeadingAst, habitsAst];
    }

    return [...acc, item];
  };

  const children = existMemoHeading
    ? ast.children.reduce(insertBeforeMemo, [])
    : [...ast.children, habitsHeadingAst, habitsAst];

  const afterAst = { ...ast, ...{ children } };
  // console.dir(afterAst, {depth: null});

  astToMarkdown(obsidianDailyNoteFilename, afterAst);
};

const main = async () => {
  const args = process.argv.slice(2);

  console.log(args);
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    logLevel: LogLevel.DEBUG,
  });

  const databaseId = process.env.NOTION_DATABASE_ID || "";
  const obsidianDailyNoteDir = args[0];

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  const pages = response.results;

  // ==== 1件で試す
  // const properties = await getHabitsFromPage(notion, pages[0]);
  // console.dir(properties, { depth: null });
  // await mergeDailyNote(obsidianDailyNoteDir, properties);
  // ==== 1件で試す

  Promise.all(
    pages.map(async (page) => {
      const properties = await getHabitsFromPage(notion, page);
      await mergeDailyNote(obsidianDailyNoteDir, properties);
    }),
  );
};

main();
