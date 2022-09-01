const { validateRequest, getWebHookEventsQueueSender } = require("./util");

module.exports = async function (context, req) {
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

        await sender.sendMessages({
            body: req.body,
        });
        context.log.info("Placed message on queue");
    }

    context.log.info("prepared response", response);
    context.res = response;
};
