
// const str = `hoge\n
// fuga\n
// →テスト\n
// →→2段目\n
// →→→3段目\n
// →→1つ戻る\n
// →→→おおおお\n
// 最上位\n
// →まだまだ\n
// →あるよ\n
// `;



// const line = str.split("\n").map(line => line.trim());

// const createNode = (text) => ({text, children: []});

// const ast = line.reduce((acc, line) => {
//   const depth = line.match(/→/g)?.length || 0;
//   const text = line.replace(/→/g, "").trim();
// }, []);


// function parseString(s) {
//   const lines = s.split('\n').map(line => line.trim()).filter(line => line);  // Split the string by lines and remove empty ones

//   const stack = [];  // This will be used to track the current parent nodes
//   const result = [];  // The final result

//   for (const line of lines) {
//       let level = 0;  // Count the number of '→' at the start of the line
//       let content = line;
//       while (content.startsWith("→")) {
//           level++;
//           content = content.substring(1).trim();
//       }

//       const node = {text: content, children: []};

//       // If level is 0, it's a top level node
//       if (level === 0) {
//           result.push(node);
//           stack.length = 0;
//           stack.push(node);
//       } else {
//           // If level is deeper than the current stack, we append it to the last node in the stack
//           if (level > stack.length) {
//               stack[stack.length - 1].children.push(node);
//               stack.push(node);
//           // If level is the same as the current stack, we go up one level and append it there
//           } else {
//               stack.length = level;
//               stack[stack.length - 1].children.push(node);
//               stack.push(node);
//           }
//       }
//   }

//   return result;
// }

function parseString(s) {
  const lines = s.split('\n').map(line => line.trim()).filter(line => line);

  function processLine(lines, stack = [], result = []) {
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
  }

  return processLine(lines);
}

const strInput = `hoge\n
fuga\n
→テスト\n
→→2段目\n
→→→3段目\n
→→1つ戻る\n
→→→おおおお\n
最上位\n
→まだまだ\n
→あるよ\n
`;

const nestedStructure = parseString(strInput);
console.log(JSON.stringify(nestedStructure, null, 2));


// ```[
// {text: "hoge", children: []},
// {text: "fuga", children: [
//   {text: "テスト", children: [
//     {text: "2段目", children: [
//       {text: "3段目", children: []},
//     ]},
//     {text: "1つ戻る", children: [
//       {text: "おおおお", children: []},
//     ]},
//   ]},
// ]},
// {text: "最上位", children: [
//   {text: "まだまだ", children: []},
//   {text: "あるよ", children: []},
// ]}
// ]
// ```