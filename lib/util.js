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

export const astToMarkdown = (filename, ast) => {
  fs.writeFileSync(filename, astToMarkdownText(ast));
}

export const removePositionFromAst = (node) => {
  if (node.children) {
    node.children.map(node => removePositionFromAst(node));
  }
  delete node.position;

  return node;
}


export const parseString = (str) => {
  const lines = str.split('\n').map(line => line.trim()).filter(line => line);

  console.log(lines);
  const processLine = (lines, stack = [], result = []) => {
    if (lines.length === 0) {
      return result;
    }

    const [currentLine, ...remainingLines] = lines;
    let level = 0;
    let content = currentLine;
    while (content.startsWith("→")) {
      level++;
      content = content.substring(1).trim();
    }

    const node = {text: content, children: []};

    if (level === 0) {
      return processLine(remainingLines, [node], [...result, node]);
    } else if (level > stack.length) {
      const newStack = [...stack, node];
      newStack[newStack.length - 2].children = [...newStack[newStack.length - 2].children, node];

      return processLine(remainingLines, newStack, result);
    } else {
      const newStack = stack.slice(0, level);
      newStack[newStack.length - 1].children = [...newStack[newStack.length - 1].children, node];

      return processLine(remainingLines, [...newStack, node], result);
    }
  };

  return processLine(lines);
}

const createListItemAst = (line) => {
  const children = line.children.length > 0 ? [createRecursiveListAst(line.children)] : [];

  return {
    type: "listItem",
    spread: false,
    checked: null,
    children: [
      {
        type: "paragraph",
        children: [
          {
            type: "text",
            value: line.text,
          },
        ],
      },
      ...children
    ]
  }
};

export const createRecursiveListAst = (lines) => {
  const nodes = lines.map(line => createListItemAst(line));

  return {
    type: "list",
    start: null,
    spread: false,
    ordered: false,
    children: nodes,
  };
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

