import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import pino from "hapi-pino";

import { reconcile } from "./controller.js";
import { verifyRequestSignature } from "./crypto.js";
import { getConfigValue } from "./azure/config.js";

const server = Hapi.server({
    port: 3000,
    host: "0.0.0.0"
});

server.route({
    method: ["GET", "POST"],
    path: "/",
    handler: async (request) => {
        const isValid = await verifyRequestSignature(request);
        const installationId = await getConfigValue("github-installation-id");

        if (!isValid || installationId !== request.payload.installation.id.toString()) {
            throw Boom.forbidden();
        }

        if (request.payload && request.payload.action && request.payload.workflow_job) {
            await reconcile(request.payload);
        }

        return "ok";
    }
});

await server.register({
    plugin: pino,
    options: process.env.NODE_ENV === "production" ? {} : {
        transport: {
            target: "pino-pretty"
        }
    },
});

await server.start();
