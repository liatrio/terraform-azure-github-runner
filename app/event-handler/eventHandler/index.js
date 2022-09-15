import { validateRequest, getWebHookEventsQueueSender } from "./util.js";

export const eventHandler = async function (context, req) {
<<<<<<< HEAD
    context.log.info("JavaScript HTTP trigger function processed a request.");

    const isValid = await validateRequest(context, req);
    context.log.info("Validated request with result", isValid);
    const response = isValid
        ? {
            // status: 200, /* Defaults to 200 */
            body: `Valid webhook message received. Queued [${req.body?.workflow_job?.run_url}] for processing`,
        }
        : {
            status: 403, /* Defaults to 200 */
            body: "Discarding invalid request",
        };
    if (isValid) {
        const sender = await getWebHookEventsQueueSender();
        context.log.info("Got queue sender instance");
=======
    context.log.verbose("JavaScript HTTP trigger function processed a request.", req.body);

    const isValid = await validateRequest(context, req);
    let response;

    if (isValid) {
        response = {
            // status: 200, /* Defaults to 200 */
            body: `Valid webhook message received. Queued [${req.body?.workflow_job?.run_url}] for processing`,
        };

        const sender = await getWebHookEventsQueueSender();
>>>>>>> 281c7af57feeb5caa4aec4eeff916611e15de46c

        await sender.sendMessages({
            body: req.body,
        });
<<<<<<< HEAD
        context.log.info("Placed message on queue");
    }

    context.log.info("prepared response", response);
=======
        context.log.verbose("Placed message on queue", sender);
    } else {
        response = {
            status: 403, /* Defaults to 200 */
            body: "Discarding invalid request",
        };
    }

    context.log.verbose("prepared response", response);
>>>>>>> 281c7af57feeb5caa4aec4eeff916611e15de46c
    context.res = response;
};
