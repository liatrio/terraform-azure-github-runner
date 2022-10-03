import { getConfigValue } from "./azure/config.js";
import { getServiceBusClient } from "./azure/clients/service-bus.js";
import { JOB_COMPLETED, JOB_QUEUED } from "./constants.js";
import { getLogger } from "./logger.js";

// name of the queue
const runnerQueue = await getConfigValue("azure-github-runners-queue");
const stateQueue = await getConfigValue("azure-github-state-queue");

export async function runnerQueueSender(runnerName, action) {
    const logger = getLogger();
    let queueName;
    if (action === JOB_QUEUED) {
        queueName = runnerQueue;
    } else if (action === JOB_COMPLETED) {
        queueName = stateQueue;
    }
    
    // create a Service Bus client using the connection string to the Service Bus namespace
    const sbClient = await getServiceBusClient();

    // createSender() can also be used to create a sender for a topic.
    const sender = sbClient.createSender(queueName);

    try {
        await sender.sendMessages({
            body: { runnerName },
            contentType: "application/json",
        });

        return true;
    } catch (error) {
        console.warn("Message failed to send create runner queue with following error message", error);
        return false;
    } finally {
		// Close the sender and client
		await sender.close();
    }
}
