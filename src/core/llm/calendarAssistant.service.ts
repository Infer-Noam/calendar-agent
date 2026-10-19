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
import { formatDate, startOfToday } from "../util/date.util.js";

const isToolUseBlock = (block: ContentBlock): block is ToolUseBlock =>
  block.type === "tool_use";

const runConversation = async (
  calendar: GoogleCalendarClient,
  messages: MessageParam[],
  iteration: number,
  systemPrompt: string
): Promise<string> => {
  if (iteration >= MAX_TOOL_ITERATIONS) {
    return TOOL_ITERATION_LIMIT_MESSAGE;
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
    return textBlock?.text ?? "I couldn't generate an answer.";
  }

  const toolResults: ToolResultBlockParam[] = await Promise.all(
    response.content.reduce<Promise<ToolResultBlockParam>[]>((results, block) => {
      if (!isToolUseBlock(block)) return results;

      const toolDefinition = TOOLS[block.name];
      const contentPromise = toolDefinition
        ? toolDefinition.run(calendar, block.input)
        : Promise.resolve(`Error: unknown tool "${block.name}"`);

      return [
        ...results,
        contentPromise.then((content) => ({ type: "tool_result" as const, tool_use_id: block.id, content })),
      ];
    }, [])
  );

  return runConversation(
    calendar,
    [
      ...messages,
      { role: MessageRole.Assistant, content: response.content },
      { role: MessageRole.User, content: toolResults },
    ],
    iteration + 1,
    systemPrompt
  );
};

export const answerCalendarQuestion = async (
  telegramUserId: string,
  question: string,
  calendar: GoogleCalendarClient
): Promise<string> => {
  const history = await getRecentTurns(telegramUserId);
  const historyMessages: MessageParam[] = history.flatMap((turn) => [
    { role: MessageRole.User, content: turn.question },
    { role: MessageRole.Assistant, content: turn.answer },
  ]);

  const answer = await runConversation(
    calendar,
    [...historyMessages, { role: MessageRole.User, content: question }],
    0,
    buildSystemPrompt(formatDate(startOfToday()))
  );
  await appendTurn(telegramUserId, { question, answer });

  return answer;
};
