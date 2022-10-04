import { v4 as uuidv4 } from "uuid";
import { setTimeout } from "node:timers/promises";

import { createRegistrationToken, listIdleGitHubRunners } from "../github.js";
import { createKeyVaultSecret, createVM, deleteVM, deleteKeyVaultSecret, listAzureRunnerVMs } from "../azure/index.js";
import { getLogger } from "../logger.js";
import { getConfigValue } from "../azure/config.js";
import {
    addRunnerToState,
    getNumberOfRunnersFromState,
    getNumberOfRunnersInWarmPoolFromState,
    removeRunnerFromState,
} from "./state.js";
import { getServiceBusClient } from "../azure/clients/service-bus.js";

let _runnerQueueSender,
    _runnerQueueReceiver,
    _stopRunnerProcessing = false;

const getRunnerQueueSender = async () => {
    if (!_runnerQueueSender) {
        const serviceBusClient = await getServiceBusClient();
        const queueName = await getConfigValue("azure-github-runners-queue");

        _runnerQueueSender = serviceBusClient.createSender(queueName);
    }

    return _runnerQueueSender;
};

const getRunnerQueueReceiver = async () => {
    if (!_runnerQueueReceiver) {
        const serviceBusClient = await getServiceBusClient();
        const queueName = await getConfigValue("azure-github-runners-queue");

        _runnerQueueReceiver = serviceBusClient.createReceiver(queueName, {
            receiveMode: "peekLock",
        });
    }

    return _runnerQueueReceiver;
};

export const processRunnerQueue = async () => {
    const logger = getLogger();
    const runnerMaxCount = Number(await getConfigValue("github-runner-maximum-count"));
    const receiver = await getRunnerQueueReceiver();

    logger.info("Runner queue process started");

    while (!_stopRunnerProcessing) { // eslint-disable-line no-unmodified-loop-condition
        const currentRunnerCount = getNumberOfRunnersFromState();

        if (currentRunnerCount >= runnerMaxCount) {
            logger.debug("Current number of runners in state", getNumberOfRunnersFromState());
            await setTimeout(1000);

            continue;
        }

        // this will block the while loop for 60 seconds
        const [message] = await receiver.receiveMessages(1, {
            maxWaitTimeInMs: 60_000,
        });

        if (_stopRunnerProcessing) {
            logger.warn("Went into stop processing condition");
            break;
        }

        // warm pool needs to be filled
        if ((currentRunnerCount >= runnerMaxCount) && !message) {
            logger.debug("No runners on queue");

            continue;
        }

        let runnerName = message?.body?.runnerName;

        runnerName = runnerName === undefined ? `gh-runner-${uuidv4()}` : runnerName;

        logger.info({ runnerName }, "Received runner on queue");

        await createRunner(runnerName);
        addRunnerToState(runnerName);
        await receiver.completeMessage(message);
    }
};

export const fillWarmPool = async () => {
    const logger = getLogger();
    const warmPoolDesiredSize = Number(await getConfigValue("github-runner-warm-pool-size"));
    const numberOfRunnersInWarmPool = getNumberOfRunnersInWarmPoolFromState();

    for (let i = 0; i < (warmPoolDesiredSize - numberOfRunnersInWarmPool); i++) {
        const runnerName = await enqueueRunnerForCreation();

        logger.info({ runnerName }, "Enqueued runner to fill warm pool");
    }
};

export const stopRunnerQueue = async () => {
    const logger = getLogger();
    const sender = await getRunnerQueueSender();
    const receiver = await getRunnerQueueReceiver();

    logger.info("Stopping runner queue process...");

    _stopRunnerProcessing = true;

    await sender.close();
    await receiver.close();
};

export const enqueueRunnerForCreation = async () => {
    const sender = await getRunnerQueueSender();

    const runnerName = `gh-runner-${uuidv4()}`;

    await sender.sendMessages({
        body: runnerName,
    });

    return runnerName;
};

const createRunner = async (runnerName) => {
    const logger = getLogger();
    const token = await createRegistrationToken();

    logger.debug("Received createRunner trigger with param", runnerName);

    await createKeyVaultSecret(runnerName, token);
    await createVM(runnerName);

    addRunnerToState(runnerName);

    logger.info({ runnerName }, "Successfully created runner");
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
