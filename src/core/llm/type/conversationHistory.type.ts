export type ConversationTurn = {
  question: string;
  answer: string;
};

export type StoredHistory = {
  turns: ConversationTurn[];
  updatedAt: number;
};
