import { getLogger } from "../logger.js";
import express from "express";

const router = express.Router({});
router.get("/", async (_req, res) => {
  const healthcheck = {
    message: "OK",
  };
  try {
    res.send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).send();
  }
});

const app = express();
const PORT = process.env.PORT || 80;

export const startHealthCheckServer = () => {
  const logger = getLogger();
  app.use("/health", router);
  app.listen(PORT, logger.info(`Server started at port ${PORT}`));
};
