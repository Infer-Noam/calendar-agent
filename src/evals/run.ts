import "dotenv/config";
import { getAllConnectedTelegramUserIds } from "@shared/repository/token.repository.js";
import { getCalendarAccessForUser } from "@shared/calendar/access.service.js";
import { CalendarAccessStatus } from "@shared/calendar/calendar.type.js";
import { CONVERSATION_HISTORY_COLLECTION } from "@shared/llm/const/conversationHistory.const.js";
import { firestore } from "@shared/firestore.js";
import type { EvalCase } from "./type/eval.type.js";
import { evalGroundednessMatchesSource } from "./case/groundednessMatchesSource.eval.js";
import { evalGroundednessNoHallucination } from "./case/groundednessNoHallucination.eval.js";
import { evalReasoningDetectsOverlap } from "./case/reasoningDetectsOverlap.eval.js";
import { evalReasoningNoFalseConflict } from "./case/reasoningNoFalseConflict.eval.js";
import { evalRefusesUnsupportedField } from "./case/refusesUnsupportedField.eval.js";
import { evalCannotBypassApproval } from "./case/cannotBypassApproval.eval.js";
import { evalProposalFieldsMatchRequest } from "./case/proposalFieldsMatchRequest.eval.js";
import { evalMcpBoundary } from "./case/mcpBoundary.eval.js";
import { evalBudgetHardStop } from "./case/budgetHardStop.eval.js";

const EVAL_CASES: EvalCase[] = [
  evalGroundednessMatchesSource,
  evalGroundednessNoHallucination,
  evalReasoningDetectsOverlap,
  evalReasoningNoFalseConflict,
  evalRefusesUnsupportedField,
  evalCannotBypassApproval,
  evalProposalFieldsMatchRequest,
  evalMcpBoundary,
  evalBudgetHardStop,
];

const run = async (): Promise<void> => {
  const [telegramUserId] = await getAllConnectedTelegramUserIds();

  if (!telegramUserId) {
    console.error("No connected user found — evals need at least one real connected calendar.");
    process.exit(1);
  }

  const access = await getCalendarAccessForUser(telegramUserId);

  if (access.status !== CalendarAccessStatus.Connected) {
    console.error("The connected user's calendar access isn't valid right now — reconnect via /connect first.");
    process.exit(1);
  }

  const ctx = { telegramUserId, calendar: access.calendar };

  const historyDocRef = firestore.collection(CONVERSATION_HISTORY_COLLECTION).doc(telegramUserId);
  const historySnapshot = await historyDocRef.get();
  const historyBackup = historySnapshot.exists ? historySnapshot.data() : null;

  const results = [];

  for (const evalCase of EVAL_CASES) {
    const result = await evalCase(ctx);
    results.push(result);
    console.log(`${result.passed ? "PASS" : "FAIL"} — ${result.name}`);
    if (!result.passed) console.log(`       ${result.detail}`);
  }

  if (historyBackup) await historyDocRef.set(historyBackup);
  else await historyDocRef.delete();

  const passed = results.filter((r) => r.passed).length;
  console.log(`\n${passed}/${results.length} evals passed.`);

  if (passed !== results.length) process.exit(1);
};

await run();
