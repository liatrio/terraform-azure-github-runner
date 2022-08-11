const Hapi = require("@hapi/hapi");

const {reconcile} = require("./controller");

const server = Hapi.server({
    port: 3000,
    host: "0.0.0.0"
});

server.route({
    method: ["GET", "POST"],
    path: "/",
    handler: async (request) => {
        // TODO: verify webhook secret

        if (request.payload && request.payload.actions && request.payload.workflow_job) {
            await reconcile(request.payload);
        }

        return "ok";
    }
});

(async () => {
    await server.start();

    console.log("Server running on %s", server.info.uri);
})();


