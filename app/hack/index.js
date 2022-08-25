/* eslint-disable no-console */

import { enqueueRunnerForCreation, getInitialRunnerWarmPool, processRunnerQueue } from "../src/runner/index.js";

const runnerName = await enqueueRunnerForCreation()



process.exit(0);
