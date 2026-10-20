import type {
  ContentBlock,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { anthropic } from "../anthropic.client.js";
import { TOOLS } from "../tools.js";
import {
  MODEL,
  MAX_RESPONSE_TOKENS,
  MAX_TOOL_ITERATIONS,
  TOOL_ITERATION_LIMIT_MESSAGE,
  VERIFIED_ACTIONS_TAG,
} from "../const/calendarAssistant.const.js";
import { buildSystemPrompt } from "../prompt/calendarAssistant.prompt.js";
import { MessageRole } from "../enum/messageRole.enum.js";
import {
  getRecentTurns,
  appendTurn,
} from "../../repository/conversationHistory.repository.js";
import { getProposal } from "../../repository/eventProposal.repository.js";
import type { GoogleCalendarClient } from "../../calendar/calendar.type.js";
import { formatDateTime, getLocalUtcOffset } from "../../util/dateTime.util.js";
import type { CalendarAnswer } from "../type/calendarAssistant.type.js";
import type { ToolRunOutcome } from "../type/tool.type.js";
import type { ToolCallRecord } from "../type/conversationHistory.type.js";

const isToolUseBlock = (block: ContentBlock): block is ToolUseBlock =>
  block.type === "tool_use";

const buildVerifiedActionsNote = async (
  toolCalls: ToolCallRecord[]
): Promise<string> => {
  if (toolCalls.length === 0)
    return `[${VERIFIED_ACTIONS_TAG}: none — no tools were called this turn]`;

  const summaries = await Promise.all(
    toolCalls.map(async ({ proposalId, name }) => {
      if (!proposalId) return name;

      const proposal = await getProposal(proposalId);

      return `${name}(proposalId=${proposalId}, currentStatus=${
        proposal?.status ?? "unknown"
      })`;
    })
  );

  return `[${VERIFIED_ACTIONS_TAG}: ${summaries.join(", ")}]`;
};

const buildConversationMessages = async (
  telegramUserId: string,
  question: string
): Promise<MessageParam[]> => {
  const history = await getRecentTurns(telegramUserId);
  const notes = await Promise.all(
    history.map((turn) => buildVerifiedActionsNote(turn.toolCalls))
  );

  const historyMessages: MessageParam[] = history.flatMap(
    ({ question: pastQuestion, answer }, index) => [
      {
        role: MessageRole.User,
        content:
          index === 0 ? pastQuestion : `${notes[index - 1]}\n\n${pastQuestion}`,
      },
      { role: MessageRole.Assistant, content: answer },
    ]
  );

  const latestNote = notes[notes.length - 1];
  const finalQuestion = latestNote ? `${latestNote}\n\n${question}` : question;

  return [...historyMessages, { role: MessageRole.User, content: finalQuestion }];
};

const runRequestedTools = async (
  content: ContentBlock[],
  calendar: GoogleCalendarClient,
  telegramUserId: string
): Promise<{ toolResults: ToolResultBlockParam[]; toolCalls: ToolCallRecord[] }> => {
  const toolRuns = await Promise.all(
    content.reduce<Promise<ToolRunOutcome>[]>((runs, block) => {
      if (!isToolUseBlock(block)) return runs;

      const toolDefinition = TOOLS[block.name];
      const resultPromise = toolDefinition
        ? toolDefinition.run({ calendar, telegramUserId }, block.input)
        : Promise.resolve({ content: `Error: unknown tool "${block.name}"` });

      return [
        ...runs,
        resultPromise.then((result) => ({
          toolUseId: block.id,
          toolName: block.name,
          ...result,
        })),
      ];
    }, [])
  );

  const toolResults: ToolResultBlockParam[] = toolRuns.map((run) => ({
    type: "tool_result" as const,
    tool_use_id: run.toolUseId,
    content: run.content,
  }));

  const toolCalls: ToolCallRecord[] = toolRuns.map((run) => ({
    name: run.toolName,
    proposalId: run.proposalId,
  }));

  return { toolResults, toolCalls };
};

export const answerCalendarQuestion = async (
  telegramUserId: string,
  question: string,
  calendar: GoogleCalendarClient
): Promise<CalendarAnswer> => {
  const systemPrompt = buildSystemPrompt(
    formatDateTime(new Date()),
    getLocalUtcOffset()
  );

  const runConversation = async (
    messages: MessageParam[],
    iteration: number
  ): Promise<CalendarAnswer> => {
    if (iteration >= MAX_TOOL_ITERATIONS) {
      return { answer: TOOL_ITERATION_LIMIT_MESSAGE, toolCalls: [] };
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      system: systemPrompt,
      tools: Object.values(TOOLS).map(
        (toolDefinition) => toolDefinition.schema
      ),
      messages,
    });

    console.log(
      `LLM usage (iteration ${iteration}) — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`
    );

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((block) => block.type === "text");
      return {
        answer: textBlock?.text ?? "I couldn't generate an answer.",
        toolCalls: [],
      };
    }

    const { toolResults, toolCalls } = await runRequestedTools(
      response.content,
      calendar,
      telegramUserId
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
      toolCalls: [...toolCalls, ...next.toolCalls],
    };
  };

  const messages = await buildConversationMessages(telegramUserId, question);
  const result = await runConversation(messages, 0);

  await appendTurn(telegramUserId, {
    question,
    answer: result.answer,
    toolCalls: result.toolCalls,
  });

  return result;
};
