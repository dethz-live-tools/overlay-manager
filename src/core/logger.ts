import chalk from "chalk";

export const log = {
  info: (msg: string) => console.log(`${chalk.cyan("ℹ")} ${msg}`),
  success: (msg: string) => console.log(`${chalk.green("✔")} ${msg}`),
  warn: (msg: string) => console.log(`${chalk.yellow("⚠")} ${msg}`),
  error: (msg: string) => console.error(`${chalk.red("✖")} ${msg}`),
  start: (msg: string) => console.log(`${chalk.blue("◐")} ${msg}`),
  dim: (msg: string) => console.log(chalk.dim(msg)),
};

export function printBox(title: string, message: string) {
  const titleText = ` ${title} `;
  const width = Math.max(
    64,
    titleText.length + 6,
    ...message.split("\n").map((l) => l.length + 4)
  );

  const remaining = Math.max(0, width - titleText.length - 2);
  const leftBorder = "─".repeat(2);
  const rightBorder = "─".repeat(remaining);

  console.log();
  console.log(chalk.magenta(`╭${leftBorder}${chalk.bold.white(titleText)}${rightBorder}╮`));
  for (const line of message.split("\n")) {
    console.log(`│ ${line}`);
  }
  console.log(chalk.magenta(`╰${"─".repeat(width)}╯`));
  console.log();
}
