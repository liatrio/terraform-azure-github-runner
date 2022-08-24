import Queue from "p-queue";
import { v4 as uuidv4 } from "uuid";
import { setTimeout } from "node:timers/promises";

import { createRegistrationToken, listIdleGitHubRunners } from "../github.js";
import { createKeyVaultSecret, createVM, deleteVM, deleteKeyVaultSecret, listAzureRunnerVMs } from "../azure/index.js";
import { getLogger } from "../logger.js";
import { getConfigValue } from "../azure/config.js";
import { addRunnerToState, getNumberOfRunnersFromState, removeRunnerFromState } from "./state.js";

const runnerQueue = new Queue({
    concurrency: 1,
});

export const enqueueRunnerForCreation = async () => {
    const logger = getLogger();
    const runnerMaxCount = Number(await getConfigValue("github-runner-maximum-count"));

    const runnerName = `gh-runner-${uuidv4()}`;

    runnerQueue.add(async () => {
        while (getNumberOfRunnersFromState() >= runnerMaxCount) {
            await setTimeout(1000);
        }

        addRunnerToState(runnerName);

        await createRunner(runnerName);

        logger.info({ runnerName }, "Created runner");
    }).catch((error) => {
        logger.error(error, "Error creating runner");

        removeRunnerFromState(runnerName);
    });

    return runnerName;
};

const createRunner = async (runnerName) => {
    const token = await createRegistrationToken();

    await createKeyVaultSecret(runnerName, token);
    await createVM(runnerName);
};

export const deleteRunner = (runnerName) => {
    const logger = getLogger();

    removeRunnerFromState(runnerName);

    Promise.all([
        deleteKeyVaultSecret(runnerName),
        deleteVM(runnerName),
    ]).then(() => {
        logger.info({ runnerName }, "Runner successfully deleted");
    }).catch((error) => {
        logger.error(error, "Error deleting runner");
    });
};

/* warm pool states
    github            azure         description
    online, idle   -  succeeded  -  obvious
    offline, idle  -  succeeded  -  gh runner config is finished registering, but gh does not see the runner online yet
    unregistered   -  creating   -  VM is being created, has not started custom data script
    unregistered   -  succeeded  -  Period of time between VM starting custom data script and registering as runner
*/
export const getInitialRunnerWarmPool = async () => {
    const [githubRunners, azureRunnerVMs] = await Promise.all([
        listIdleGitHubRunners(),
        listAzureRunnerVMs(),
    ]);

    return azureRunnerVMs
        .filter((vm) => {
            const githubRunner = githubRunners.find((runner) => runner.name === vm.name);

            return githubRunner || vm.provisioningState === "Succeeded" || vm.provisioningState === "Creating";
        })
        .map((vm) => vm.name);
};
