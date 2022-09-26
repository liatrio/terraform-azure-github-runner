import { delay } from "@azure/service-bus";

import { getServiceBusClient } from "./azure/clients/service-bus.js";
import { getConfigValue } from "./azure/config.js";
import { processStateQueueEvents } from "./controller.js";

let _stopProcessing = false;
let _receiver;

// name of the queue
const queueName = await getConfigValue("azure-github-state-queue");

const getReceiver = async () => {
    if (!_receiver) {
        const client = await getServiceBusClient();
        _receiver = await client.createReceiver(queueName, {
            receiveMode: "peekLock"
        });
    }
    return _receiver;
};

// function to handle messages
const stateQueueEventHandler = async (messageReceived) => {
    const messageStatus = await processStateQueueEvents(messageReceived.body);
    if (messageStatus) {
        console.log("Process Message (StateQueue): ",
        messageReceived.body
        );
        const receiver = await getReceiver();
        await receiver.completeMessage(messageReceived);
    } else {
        console.warn(
            "Message failed to process (StateQueue):", 
            messageReceived.body
            )
    };
};

// function to handle any errors
const stateQueueEventErrorHandler = async (error) => {
    console.log(error);
};

export async function processStateEventQueue() {
    const receiver = await getReceiver();

    receiver.subscribe({
        processMessage: stateQueueEventHandler,
        processError: stateQueueEventErrorHandler,
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