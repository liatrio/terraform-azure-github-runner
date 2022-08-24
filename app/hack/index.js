/* eslint-disable no-console */

import { getLogger } from "../src/logger.js";
import { addRunnerToState, getRunnerState, getRunnerWarmPoolFromState, setRunnerAsBusyInState } from "../src/runner/state.js";

const logger = getLogger();

addRunnerToState("gh-runner-e07a4fd9-e025-416a-aee1-4abc3cc1df44");
addRunnerToState("gh-runner-40fa7f3c-2a41-4d7a-992e-cf68f59f75e9");

setRunnerAsBusyInState("gh-runner-e07a4fd9-e025-416a-aee1-4abc3cc1df44");

logger.info(getRunnerState(), "runner state");
logger.info(getRunnerWarmPoolFromState(), "warm pool");

process.exit(0);
