import { delay } from "@azure/service-bus";

import { getServiceBusClient } from "./azure/clients/service-bus.js";
import { getConfigValue } from "./azure/config.js";
import { processWebhookEvents } from "./controller.js";

const POLL_INTERVAL = 20000
let _stopProcessing = false;
let _reciever;

// name of the queue
const queueName = await getConfigValue("azure-github-state-queue");

const getReceiver = async () => {
    if (!_reciever) {
        const client = await getServiceBusClient();
        _reciever = await client.createReceiver(queueName, {
            recieveMode: "peekLock"
        });
    }
    return _reciever;
};

// function to handle messages
const stateQueueEventHandler = async (messageReceived) => {
    const messageStatus = await processStateQueueEvents(messageReceived.body);
    if (messageStatus) {
        console.log("Process Message: ",
        messageReceived.body.action,
        messageReceived.body.workflow_job.id,
        );
        const receiver = await getReceiver();
        await receiver.completeMessage(messageReceived);
    } else {
        console.warn(
            "Message failed to process:", 
            messageReceived.body.action,
            messageReceived.body.workflow_job?.id,
            )
    };
};

// function to handle any errors
const stateQueueEventErrorHandler = async (error) => {
    console.log(error);
};

export async function stateQueueEventEventQueue() {
    const receiver = await getReceiver();

    receiver.subscribe({
        processMessage: stateQueueEventHandler,
        processError: stateQueueErrorHandler,
    });
}

export async function cleanup() {
    _stopProcessing = true;
    console.info("Begin cleanup")

    const receiver = getReceiver();
    const sbClient = getServiceBusClient();
    await receiver.close();
    await sbClient.close();
}