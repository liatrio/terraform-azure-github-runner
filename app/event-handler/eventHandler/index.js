import { validateRequest, getWebHookEventsQueueSender } from "./util.js";

export const eventHandler = async function (context, req) {
  context.log.verbose(
    "JavaScript HTTP trigger function processed a request.",
    req.body
  );

  const isValid = await validateRequest(context, req);
  let response;

  if (isValid) {
    response = {
      // status: 200, /* Defaults to 200 */
      body: `Valid webhook message received. Queued [${req.body?.workflow_job?.run_url}] for processing`,
    };

    const sender = await getWebHookEventsQueueSender(context);

    await sender.sendMessages({
      body: req.body,
    });
    context.log.verbose("Placed message on queue", sender);
  } else {
    response = {
      status: 403 /* Defaults to 200 */,
      body: "Discarding invalid request",
    };
  }

  context.log.verbose("prepared response", response);
  context.res = response;
};
