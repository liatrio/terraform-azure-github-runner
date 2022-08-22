import { Worker } from "node:worker_threads";

import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import pino from "hapi-pino";

import { verifyRequestSignature } from "./crypto.js";
import { getConfigValue } from "./azure/config.js";

const server = Hapi.server({
    port: 3000,
    host: "0.0.0.0",
});

await server.register({
    plugin: pino,
    options: process.env.NODE_ENV === "production"
        ? {}
        : {
            transport: {
                target: "pino-pretty",
            },
        },
});

const worker = new Worker("./app/src/worker.js");

worker.on("message", (message) => {
    if (message.info) {
        if (message.info.payload) {
            server.logger.info(message.info.payload, message.info.message);
        } else {
            server.logger.info(message.info.message);
        }
    }

    if (message.error) {
        if (message.error.payload) {
            server.logger.error(message.error.payload, message.error.message);
        } else {
            server.logger.error(message.error.message);
        }
    }
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
            // process.exit(exitCode);
            console.log("Worker thread exited with code:", exitCode);
        });
    });
});
