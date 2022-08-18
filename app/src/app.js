const Hapi = require("@hapi/hapi");
const Boom = require("@hapi/boom");

const { reconcile } = require("./controller");
const { verifyRequestSignature } = require("./crypto");

const server = Hapi.server({
    port: 3000,
    host: "0.0.0.0"
});

server.route({
    method: ["GET", "POST"],
    path: "/",
    handler: async (request) => {
        const isValid = await verifyRequestSignature(request);

        if (!isValid) {
            throw Boom.forbidden();
        }

        if (request.payload && request.payload.action && request.payload.workflow_job) {
            await reconcile(request.payload);
        }

        return "ok";
    }
});

(async () => {
    await server.start();

    console.log("Server running on %s", server.info.uri);
})();
