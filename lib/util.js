import { fromMarkdown } from "mdast-util-from-markdown";
import { frontmatter } from "micromark-extension-frontmatter";
import { toMarkdown } from "mdast-util-to-markdown";
import {
  frontmatterFromMarkdown,
  frontmatterToMarkdown,
} from "mdast-util-frontmatter";
import * as fs from "fs";

export const markdownToAst = (filename) => {
  const markdown = fs.readFileSync(filename);

  return fromMarkdown(markdown, {
    extensions: [frontmatter(["yaml"])],
    mdastExtensions: [frontmatterFromMarkdown(["yaml"])],
  });
};

const astToMarkdownText = (ast) => {
  const options = {
    bullet: "-",
    extensions: [frontmatterToMarkdown(["yaml"])],
  };

  // FIXME: unsafeオプションを使ってエスケープさせないようにしたかったが、うまくいかなかったため場当たり的な対応をしている
  const replacer = (str) => {
    return str
      .replace(/\\\[/g, "[")
      .replace(/\\_/g, "_")
      .replace(/\\&/g, "&")
      .replace(/\\\*/g, "*");
  };

  return replacer(toMarkdown(ast, options))
}

export const astToMarkdown = (ast, filename) => {
  fs.writeFileSync(filename, astToMarkdownText(ast));
}

export const removePositionFromAst = (node) => {
  if (node.children) {
    node.children.map(node => removePositionFromAst(node));
  }
  delete node.position;

  return node;
}

export const createListAst = (rows, valueCallbackFn) => {
  const items = rows.map(row => ({
    type: "listItem",
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            value: valueCallbackFn(row),
          },
        ],
      },
    ]
  }));

  return {
    type: "list",
    start: null,
    spread: false,
    children: items,
  };
}

export const createHeadingAst = (text, depth) => ({
  type: "heading",
  depth: depth,
  children: [
    {
      type: "text",
      value: text,
    },
  ],
});