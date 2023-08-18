import {fromMarkdown} from 'mdast-util-from-markdown'
import {frontmatter} from 'micromark-extension-frontmatter'
import {toMarkdown} from 'mdast-util-to-markdown'
import {
  frontmatterFromMarkdown,
  frontmatterToMarkdown,
} from "mdast-util-frontmatter";
import * as fs from "fs";
import yaml from 'js-yaml';


const ast = fromMarkdown(fs.readFileSync('sample.md'), {
  extensions: [frontmatter(['yaml'])],
  mdastExtensions: [frontmatterFromMarkdown(['yaml'])]
});
console.log(ast);

// const frontmatter = {
//   title: "test",
//   tags: ["test"],
//   fuga: " ",
//   piyo: undefined,
//   date: "2021-01-01",
// }

// const options = {
//   schema: yaml.JSON_SCHEMA
// }

// console.log(yaml.dump(frontmatter, options))


const children = ast.children.map(node => {
  // change frontmatter value
  if (node.type === 'yaml') {
    const frontmatter = yaml.load(node.value, {schema: yaml.JSON_SCHEMA});
    const mergedFrontmatter = {...frontmatter, ...{added: "2023-08-01", empty: '', month: '2023-08'}};

    console.log('yaml =========================');
    console.log(yaml.dump(mergedFrontmatter));

    return {...node, ...{value: yaml.dump(mergedFrontmatter, {
      schema: yaml.JSON_SCHEMA,
      styles: {
        '!!null': 'empty'
      },
    })}};
  }

  return node;
});

const afterAst = { ...ast, ...{children}};

const options = {
  bullet: '-',
  extensions: [frontmatterToMarkdown(['yaml'])]
}

console.log('markdown =========================');
console.log(afterAst)


console.log(toMarkdown(afterAst, options));
// fs.writeFileSync('sample_stored.md', toMarkdown(afterAst, options));

