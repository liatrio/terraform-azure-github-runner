import { getLogger } from "./logger.js";
import { getServiceBusClient } from "./azure/clients/service-bus.js";
import { getConfigValue } from "./azure/config.js";
import { processWebhookEvents, processStateQueueEvents } from "./controller.js";

let _eventReceiver, _stateReceiver;

const eventQueueName = await getConfigValue("azure-github-webhook-events-queue");
const stateQueueName = await getConfigValue("azure-github-state-queue");

const getReceiver = async (queueName) => {
    if (!_eventReceiver && queueName === "EVENT_QUEUE") {
        const client = await getServiceBusClient();
        _eventReceiver = await client.createReceiver(eventQueueName, {
            receiveMode: "peekLock",
        });

        return _eventReceiver;
    } else if (!_stateReceiver && queueName === "STATE_QUEUE") {
        const client = await getServiceBusClient();
        _stateReceiver = await client.createReceiver(stateQueueName, {
            receiveMode: "peekLock",
        });

        return _stateReceiver;
    } else if (queueName === "EVENT_QUEUE") {
        return _eventReceiver;
    }

    return _stateReceiver;
};

const webhookEventHandler = async (messageReceived) => {
    const logger = getLogger();
    const messageStatus = await processWebhookEvents(messageReceived.body);
    if (messageStatus) {
        logger.info(
            "[EventQueue] Process Message: ",
            {
                action: messageReceived.body.action,
                id: messageReceived.body.workflow_job.id,
            },
        );
        const receiver = await getReceiver();
        await receiver.completeMessage(messageReceived);
    } else {
        logger.warn(
            "[EventQueue] Message failed to process:",
            {
                action: messageReceived.body.action,
                id: messageReceived.body.workflow_job?.id,
            },
        );
    }
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

const queueErrorHandler = async (error) => {
    const logger = getLogger();
    logger.error(error);
};

export const processQueue = async (queueName) => {
    const logger = getLogger();
    const receiver = await getReceiver(queueName);

    if (queueName === "EVENT_QUEUE") {
        _eventReceiver = receiver;
        receiver.subscribe({
            processMessage: webhookEventHandler,
            processError: queueErrorHandler,
        });
    } else if (queueName === "STATE_QUEUE") {
        _stateReceiver = receiver;
        receiver.subscribe({
            processMessage: stateQueueEventHandler,
            processError: queueErrorHandler,
        });
    } else {
        logger.error("Invalid queue name provided: ", queueName);
    }
};

export const cleanup = async (queueName) => {
    const logger = getLogger();
    logger.debug("Begin cleanup", queueName);

    const receiver = getReceiver(queueName);
    const sbClient = getServiceBusClient();
    await receiver.close;
    await sbClient.close;
};
