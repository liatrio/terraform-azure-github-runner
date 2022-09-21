import { delay, ServiceBusClient } from "@azure/service-bus";
import { getConfigValue } from "./azure/config.js";
import { getAzureCredentials } from "./azure/credentials.js";
import { processWebhookEvents } from "./controller.js";

// connection string to your Service Bus namespace
const connectionString = await getConfigValue("azure-service-bus-namespace-uri");

// name of the queue
const queueName = await getConfigValue("azure-github-webhook-events-queue");

export async function webhookEventReceiver() {
    console.log(connectionString);
    // create a Service Bus client using the connection string to the Service Bus namespace
    const sbClient = new ServiceBusClient(connectionString, getAzureCredentials());

    // createReceiver() can also be used to create a receiver for a subscription.
    const receiver = sbClient.createReceiver(queueName, {
        receiveMode: "peekLock",
    });

    // function to handle messages
    const webhookEventHandler = async (messageReceived) => {
        const messageStatus = await processWebhookEvents(messageReceived.body);
        if (messageStatus) {
            messageReceived.processMessage();
        } else {
            console.warn(
                "Message failed to process", 
                messageReceived.body.action,
                messageReceived.body.workflow_job.id,
                )
        };
    };

    // function to handle any errors
    const webhookEventErrorHandler = async (error) => {
        console.log(error);
    };

    // subscribe and specify the message and error handlers
    receiver.subscribe({
        processMessage: webhookEventHandler,
        processError: webhookEventErrorHandler,
    });

    // Waiting long enough before closing the sender to send messages
    await delay(20000);

    await receiver.close();
    await sbClient.close();
}
