import { setTimeout } from "node:timers/promises";

import { createRunner, deleteRunner } from "../src/runner.js";
import { getRunners } from "../src/github.js";
import { listVMs } from "../src/azure/index.js";

const now = new Date();

// const name = await createRunner();

// console.log("Created runner", name);

// await setTimeout(30 * 1000);

// const runners = await getRunners(true, true);

// runners.forEach((runner) => {
//     console.log(runner.name, runner.status, runner.busy);
// });

// await deleteRunner(name);

await listVMs();

const then = new Date();

console.log(`Took ${(then - now) / 1000} seconds`);

// eslint-disable-next-line no-process-exit, unicorn/no-process-exit
process.exit(0);
