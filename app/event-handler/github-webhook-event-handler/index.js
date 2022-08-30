import { validateRequest } from "../../utils/validate.js";
import { getServiceBusClient } from "../../utils/service-bus.js";
import { getConfigValue } from "../../utils/config.js";

const getWebHookEventsQueueSender = async () => {
    const serviceBusClient = await getServiceBusClient();
    const queueName = await getConfigValue("azure-github-webhook-events-queue");

    return serviceBusClient.createSender(queueName);
};

export const eventHandler = async function (context, req) {
    context.log("JavaScript HTTP trigger function processed a request.");

    const isValid = await validateRequest(req);
    const response = isValid
        ? {
            // status: 200, /* Defaults to 200 */
            body: `Valid webhook message received. Queued [${req.body?.workflow_job?.name}] for processing`,
        }
        : {
            status: 403, /* Defaults to 200 */
            body: "Discarding invalid request",
        };
    if (isValid) {
        const sender = await getWebHookEventsQueueSender();

        await sender.sendMessages({
            body: req.body,
        });
    }

    context.res = response;
};
