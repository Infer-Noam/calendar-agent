import type {
  ContentBlock,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { anthropic } from "./anthropic.client.js";
import { TOOLS } from "./tools.js";
import {
  MODEL,
  MAX_RESPONSE_TOKENS,
  MAX_TOOL_ITERATIONS,
  buildSystemPrompt,
  TOOL_ITERATION_LIMIT_MESSAGE,
} from "./const/calendarAssistant.const.js";
import { MessageRole } from "./enum/messageRole.enum.js";
import {
  getRecentTurns,
  appendTurn,
} from "../repository/conversationHistory.repository.js";
import type { GoogleCalendarClient } from "../calendar/calendar.type.js";
import { formatDate, startOfToday, getLocalUtcOffset } from "../util/dateTime.util.js";
import type { CalendarAnswer } from "./type/calendarAssistant.type.js";
import type { ToolRunOutcome } from "./type/tool.type.js";

const isToolUseBlock = (block: ContentBlock): block is ToolUseBlock =>
  block.type === "tool_use";

export const answerCalendarQuestion = async (
  telegramUserId: string,
  question: string,
  calendar: GoogleCalendarClient
): Promise<CalendarAnswer> => {
  const systemPrompt = buildSystemPrompt(formatDate(startOfToday()), getLocalUtcOffset());

  const runConversation = async (
    messages: MessageParam[],
    iteration: number
  ): Promise<CalendarAnswer> => {
    if (iteration >= MAX_TOOL_ITERATIONS) {
      return { answer: TOOL_ITERATION_LIMIT_MESSAGE, proposalIds: [] };
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      system: systemPrompt,
      tools: Object.values(TOOLS).map((toolDefinition) => toolDefinition.schema),
      messages,
    });

    console.log(
      `LLM usage (iteration ${iteration}) — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`
    );

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((block) => block.type === "text");
      return {
        answer: textBlock?.text ?? "I couldn't generate an answer.",
        proposalIds: [],
      };
    }

    const toolRuns = await Promise.all(
      response.content.reduce<Promise<ToolRunOutcome>[]>(
        (runs, block) => {
          if (!isToolUseBlock(block)) return runs;

          const toolDefinition = TOOLS[block.name];
          const resultPromise = toolDefinition
            ? toolDefinition.run({ calendar, telegramUserId }, block.input)
            : Promise.resolve({ content: `Error: unknown tool "${block.name}"` });

          return [
            ...runs,
            resultPromise.then((result) => ({ toolUseId: block.id, ...result })),
          ];
        },
        []
      )
    );

    const toolResults: ToolResultBlockParam[] = toolRuns.map((run) => ({
      type: "tool_result" as const,
      tool_use_id: run.toolUseId,
      content: run.content,
    }));

    const proposalIds = toolRuns.reduce<string[]>(
      (ids, run) => (run.proposalId ? [...ids, run.proposalId] : ids),
      []
    );

    const next = await runConversation(
      [
        ...messages,
        { role: MessageRole.Assistant, content: response.content },
        { role: MessageRole.User, content: toolResults },
      ],
      iteration + 1
    );

    return {
      answer: next.answer,
      proposalIds: [...proposalIds, ...next.proposalIds],
    };
  };

  const history = await getRecentTurns(telegramUserId);

  const historyMessages: MessageParam[] = history.flatMap(({ question, answer }) => [
    { role: MessageRole.User, content: question },
    { role: MessageRole.Assistant, content: answer },
  ]);

  const result = await runConversation(
    [...historyMessages, { role: MessageRole.User, content: question }],
    0
  );
  await appendTurn(telegramUserId, { question, answer: result.answer });

  return result;
};
