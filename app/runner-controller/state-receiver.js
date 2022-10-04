import { getServiceBusClient } from "./azure/clients/service-bus.js";
import { getConfigValue } from "./azure/config.js";
import { processStateQueueEvents } from "./controller.js";
import { getLogger } from "./logger.js";

let _receiver;

const queueName = await getConfigValue("azure-github-state-queue");

const getReceiver = async () => {
    if (!_receiver) {
        const client = await getServiceBusClient();
        _receiver = await client.createReceiver(queueName, {
            receiveMode: "peekLock",
        });
    }

    return _receiver;
};

const stateQueueEventHandler = async (messageReceived) => {
    const logger = getLogger();
    const messageStatus = await processStateQueueEvents(messageReceived.body?.runnerName);
    if (messageStatus) {
        logger.info(
            "[StateQueue] Process Message: ",
            messageReceived.body,
        );
        const receiver = await getReceiver();
        await receiver.completeMessage(messageReceived);
    } else {
        logger.warn(
            "[StateQueue] Message failed to process :",
            messageReceived.body,
        );
    }
};

const stateQueueEventErrorHandler = async (error) => {
    const logger = getLogger();
    logger.info(error);
};

export const processStateEventQueue = async () => {
    const receiver = await getReceiver();

    receiver.subscribe({
        processMessage: stateQueueEventHandler,
        processError: stateQueueEventErrorHandler,
    });
};

export const cleanup = async () => {
    const logger = getLogger();

    logger.debug("[StateQueue] Begin cleanup");

    const receiver = getReceiver();
    const sbClient = getServiceBusClient();
    await receiver.close();
    await sbClient.close();
};
