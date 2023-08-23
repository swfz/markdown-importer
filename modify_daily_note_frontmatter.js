import { Client, LogLevel } from "@notionhq/client";
import yaml from 'js-yaml';
import { markdownToAst, astToMarkdown } from "./lib/util.js";
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';
dayjs.extend(isoWeek);

// 範囲: 2021-10-27 - 2022-12-30

// NOTE: 2023-08-23時点の状況として、Calendarに表示されるWeekNumberが一般的なIsoWeekと比較して1つずれている
// いつもCalendarからWeeklyNoteを作成するので間違ってはいてもCalendarが表示するWeekNumberに合わせる判断をした
// ワンショットの実行でデータ範囲が限られているので無理やり合わせる対応を入れる
// Ref: https://github.com/liamcain/obsidian-calendar-plugin/issues/271
const weekString = (date) => {
  const y = dayjs(date).year();
  const w = dayjs(date).isoWeek();

  let week, year;
  if (y === 2021 && w === 52) {
    week = 1;
    year = 2022;
  }
  else {
    week = w + 1;
    year = y;
  }

  return `${year}-W${week.toString().padStart(2, '0')}`
}

const mergeDailyNoteFrontmatter = (dailyNoteDir, page) => {
  const date = page.properties.Date.date.start;
  const filename = `${dailyNoteDir}/${date}.md`;
  const ast = markdownToAst(filename);

  const frontmatterIndex = ast.children.findIndex(node => node.type === "yaml");
  const frontmatterNode = ast.children[frontmatterIndex];
  const metadata = yaml.load(frontmatterNode.value, { schema: yaml.JSON_SCHEMA });

  const updatedMetadata = {...metadata, ...{ week: weekString(date) }};
  const frontmatterAst = {
    type: "yaml",
    value: yaml.dump(updatedMetadata, {
      schema: yaml.JSON_SCHEMA,
      styles: {
        '!!null': 'empty'
      },
    }),
  }
  const children = [
    ...ast.children.slice(0,frontmatterIndex),
    frontmatterAst,
    ...ast.children.slice(frontmatterIndex + 1)
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
  const obsidianDailyNoteDir = args[0];

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: "Date",
          date: {
            on_or_after: "2022-11-01",
          }
        },
        {
          property: "Date",
          date: {
            on_or_before: "2023-01-31"
          }
        }
      ]
    }
  });

  const pages = response.results;

  pages.forEach(page => {
    console.info('writing... ', page.properties.Date.date.start)
    mergeDailyNoteFrontmatter(obsidianDailyNoteDir, page);
  });
};

main();
