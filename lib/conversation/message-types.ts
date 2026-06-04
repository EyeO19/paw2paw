export type MessageDeliveryStatus = "sending" | "sent" | "failed";

export type ConversationMessage = {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deliveryStatus: MessageDeliveryStatus;
  flagged: boolean;
};

export function sortMessages(a: ConversationMessage, b: ConversationMessage): number {
  const timeDiff =
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }
  return a.id.localeCompare(b.id);
}

export function mapRowToMessage(row: {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  flagged?: boolean;
}): ConversationMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
    deliveryStatus: "sent",
    flagged: row.flagged ?? false,
  };
}

export function upsertMessages(
  current: ConversationMessage[],
  incoming: ConversationMessage[],
): ConversationMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));

  for (const message of incoming) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort(sortMessages);
}

export function removeTempDuplicate(
  messages: ConversationMessage[],
  realMessage: ConversationMessage,
): ConversationMessage[] {
  const filtered = messages.filter((message) => {
    if (!message.id.startsWith("tmp-")) {
      return true;
    }

    const sameSender = message.senderId === realMessage.senderId;
    const sameContent = message.content === realMessage.content;
    const withinWindow =
      Math.abs(
        new Date(message.createdAt).getTime() -
          new Date(realMessage.createdAt).getTime(),
      ) < 5000;

    return !(sameSender && sameContent && withinWindow);
  });

  return upsertMessages(filtered, [realMessage]);
}
