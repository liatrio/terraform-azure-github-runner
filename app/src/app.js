import { Worker } from "node:worker_threads";

import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";

import { verifyRequestSignature } from "./crypto.js";
import { getConfigValue } from "./azure/config.js";
import { getLogger } from "./logger.js";

const server = Hapi.server({
    port: process.env.PORT || 3000,
    host: "0.0.0.0",
});

const worker = new Worker("./app/src/worker.js");

worker.on("message", ({ level, args }) => {
    const logger = getLogger();

    logger[level](...args);
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
            worker.postMessage(request.payload);
        }

        return "ok";
    },
});

await server.start();

["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
        await server.stop();

        worker.postMessage("stop");

        worker.on("exit", (exitCode) => {
            process.exit(exitCode);
        });
    });
});
