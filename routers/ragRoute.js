// routes/ragRoutes.js
import express from "express";
import { askCarAssistant } from "../controllers/ragController.js";

const router = express.Router();

router.post("/ask", askCarAssistant);

export default router;
