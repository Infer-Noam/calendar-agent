import { timingSafeEqual } from "crypto";
import express from "express";
import type { Bot } from "grammy";
import type { BotContext } from "../middleware/telegramIdentity/botContext.type.js";
import { sendProposalApprovalPrompt } from "../service/proposalNotification.service.js";
import {
  NOTIFY_PROPOSAL_PATH,
  NOTIFY_PROPOSAL_SECRET_HEADER,
} from "@shared/proposalNotification/proposalNotification.const.js";

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

export const createNotifyProposalRouter = (bot: Bot<BotContext>, secret: string) => {
  const router = express.Router();

  router.post(NOTIFY_PROPOSAL_PATH, express.json(), async (req, res) => {
    const provided = req.get(NOTIFY_PROPOSAL_SECRET_HEADER);

    if (!provided || !safeEqual(provided, secret)) {
      res.status(401).send("Unauthorized");
      return;
    }

    const proposalId = typeof req.body?.proposalId === "string" ? req.body.proposalId : undefined;

    if (!proposalId) {
      res.status(400).send("Missing proposalId");
      return;
    }

    try {
      await sendProposalApprovalPrompt(bot, proposalId);
      res.status(204).end();
    } catch (err) {
      console.error("Notify proposal route failed:", err);
      res.status(500).send("Notify proposal failed");
    }
  });

  return router;
};
