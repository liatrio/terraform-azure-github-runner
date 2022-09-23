import { ServiceBusClient } from "@azure/service-bus";
import { v4 as uuidv4 } from "uuid";

import { getConfigValue } from "./azure/config.js";
import { getAzureCredentials } from "./azure/credentials.js";
import { getServiceBusClient } from "./azure/clients/service-bus.js";

// connection string to your Service Bus namespace
const connectionString = await getConfigValue("azure-service-bus-namespace-uri");

// name of the queue
const queueName = await getConfigValue("azure-github-runners-queue");

export async function enqueueRunner() {
    // create a Service Bus client using the connection string to the Service Bus namespace
    const sbClient = await getServiceBusClient();

    // createSender() can also be used to create a sender for a topic.
    const sender = sbClient.createSender(queueName);

    try {
        const runnerName = `gh-runner-${uuidv4()}`;

        await sender.sendMessages({
            body: runnerName,
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
