/* eslint-disable no-console */

import { enqueueRunnerForCreation } from "../src/runner/index.js";

await enqueueRunnerForCreation();

process.exit(0);
