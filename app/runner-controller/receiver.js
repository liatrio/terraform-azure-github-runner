import { getLogger } from "./logger.js";
import { getServiceBusClient } from "./azure/clients/service-bus.js";
import { getConfigValue } from "./azure/config.js";
import { processWebhookEvents } from "./controller.js";

let _receiver;

// name of the queue
const queueName = await getConfigValue("azure-github-webhook-events-queue");

const getReceiver = async () => {
    if (!_receiver) {
        const client = await getServiceBusClient();
        _receiver = await client.createReceiver(queueName, {
            receiveMode: "peekLock",
        });
    }

    return _receiver;
};

// function to handle messages
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

// function to handle any errors
const webhookEventErrorHandler = async (error) => {
    const logger = getLogger();
    logger.error(error);
};

export const processWebhookEventQueue = async () => {
    const receiver = await getReceiver();

    receiver.subscribe({
        processMessage: webhookEventHandler,
        processError: webhookEventErrorHandler,
    });
};

export const cleanup = async () => {
    const logger = getLogger();
    logger.debug("[EventQueue] Begin cleanup");

    const receiver = getReceiver();
    const sbClient = getServiceBusClient();
    await receiver.close();
    await sbClient.close();
};
