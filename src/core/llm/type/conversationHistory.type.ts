export type ToolCallRecord = {
  name: string;
  proposalId?: string;
};

export type ConversationTurn = {
  question: string;
  answer: string;
  toolCalls: ToolCallRecord[];
};

export type StoredHistory = {
  turns: ConversationTurn[];
  updatedAt: number;
};
