import {
  NOTIFY_PROPOSAL_PATH,
  NOTIFY_PROPOSAL_SECRET_HEADER,
} from "@shared/proposalNotification/proposalNotification.const.js";

export const notifyProposal = async (
  coreServerUrl: string,
  secret: string,
  proposalId: string
): Promise<void> => {
  const url = new URL(NOTIFY_PROPOSAL_PATH, coreServerUrl).toString();

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [NOTIFY_PROPOSAL_SECRET_HEADER]: secret,
    },
    body: JSON.stringify({ proposalId }),
  }).catch((err) => {
    console.error("Failed to notify proposal:", err);
  });
};
