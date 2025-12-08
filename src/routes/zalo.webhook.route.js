import express from "express";
import { handleZaloWebhook } from "../controllers/webhook.controller.js";

const routeForWebhook = express.Router();

routeForWebhook.post("/webhook", handleZaloWebhook);

export default routeForWebhook;
