import { createRecursiveListAst } from "./lib/util.js";


const lines = [
  { text: 'hoge', children: [] },
  {
    text: 'fuga',
    children: [
      {
        text: 'テスト',
        children: [
          { text: '2段目', children: [ { text: '3段目', children: [] } ] },
          {
            text: '1つ戻る',
            children: [ { text: 'おおおお', children: [] } ]
          }
        ]
      }
    ]
  },
  {
    text: '最上位',
    children: [ { text: 'まだまだ', children: [] }, { text: 'あるよ', children: [] } ]
  }
]

const ast = createRecursiveListAst(lines);

console.dir(ast, {depth: null});