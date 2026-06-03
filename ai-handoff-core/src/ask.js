const readline = require("node:readline/promises");

// Node's readline.promises.question() reads the first line from piped stdin
// correctly but stalls on subsequent questions (a long-standing quirk of the
// promise-based wrapper). For TTY we still want readline — line editing,
// history, and backspace all matter for a manager typing paragraphs. For
// piped stdin (smoke tests, scripting) we use a simple data-event reader.

function createTtyAsker() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask: async (prompt) => (await rl.question(prompt)).trim(),
    close: () => rl.close(),
  };
}

function createPipedAsker() {
  let buffer = "";
  const pending = [];
  const waiters = [];
  let ended = false;

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, "");
      buffer = buffer.slice(nl + 1);
      if (waiters.length) waiters.shift()(line);
      else pending.push(line);
    }
  });
  process.stdin.on("end", () => {
    ended = true;
    if (buffer.length) {
      if (waiters.length) waiters.shift()(buffer);
      else pending.push(buffer);
      buffer = "";
    }
    while (waiters.length) waiters.shift()("");
  });

  return {
    ask: async (prompt) => {
      process.stdout.write(prompt);
      let line;
      if (pending.length) line = pending.shift();
      else if (ended) line = "";
      else line = await new Promise((resolve) => waiters.push(resolve));
      process.stdout.write(line + "\n");
      return (line || "").trim();
    },
    close: () => {},
  };
}

function createAsker() {
  return process.stdin.isTTY ? createTtyAsker() : createPipedAsker();
}

module.exports = { createAsker };
