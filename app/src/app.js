const Hapi = require("@hapi/hapi");
const Boom = require("@hapi/boom");
const pino = require("hapi-pino");

const { reconcile } = require("./controller");
const { verifyRequestSignature } = require("./crypto");
const { getConfigValue } = require("./azure/config");

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

(async () => {
    await server.register({
        plugin: pino,
        options: process.env.NODE_ENV === "production" ? {} : {
            transport: {
                target: "pino-pretty"
            }
        },
    });

    await server.start();
})();
