import { listBusyGitHubRunners } from "../github.js";
import { getInitialRunnerWarmPool } from "./index.js";

const runnerMap = new Map();

export const initializeRunnerState = async () => {
  const [warmPool, busyRunners] = await Promise.all([
    getInitialRunnerWarmPool(),
    listBusyGitHubRunners(),
  ]);

  warmPool.forEach((runner) => {
    addRunnerToState(runner);
  });

  busyRunners.forEach((runner) => {
    addRunnerToState(runner.name, true);
  });
};

export const addRunnerToState = (runnerName, busy = false) => {
  runnerMap.set(runnerName, {
    busy,
  });
};

export const removeRunnerFromState = (runnerName) => {
  runnerMap.delete(runnerName);
};

export const setRunnerAsBusyInState = (runnerName) => {
  runnerMap.set(runnerName, {
    busy: true,
  });
};

export const getRunnerWarmPoolFromState = () => getRunnerState(true);

export const getRunnerState = (onlyReturnIdleRunners = false) => {
  const result = {};

  runnerMap.forEach((runnerState, runnerName) => {
    if (onlyReturnIdleRunners && !runnerState.busy) {
      result[runnerName] = runnerState;
    } else if (!onlyReturnIdleRunners) {
      result[runnerName] = runnerState;
    }
  });

  return result;
};

export const getNumberOfRunnersFromState = () => runnerMap.size;

export const getNumberOfRunnersInWarmPoolFromState = () =>
  Object.keys(getRunnerWarmPoolFromState()).length;
