export type WellbeingResponse = "up" | "down" | "neutral";

export type WellbeingState = {
  promptSentAt: string | null;
  promptSenderId: string | null;
  response: WellbeingResponse | null;
  respondedBy: string | null;
};

export const emptyWellbeingState: WellbeingState = {
  promptSentAt: null,
  promptSenderId: null,
  response: null,
  respondedBy: null,
};

export function mapWellbeingRow(row: {
  wellbeing_prompt_sent_at?: string | null;
  wellbeing_prompt_sender_id?: string | null;
  wellbeing_response?: WellbeingResponse | null;
  wellbeing_responded_by?: string | null;
}): WellbeingState {
  return {
    promptSentAt: row.wellbeing_prompt_sent_at ?? null,
    promptSenderId: row.wellbeing_prompt_sender_id ?? null,
    response: row.wellbeing_response ?? null,
    respondedBy: row.wellbeing_responded_by ?? null,
  };
}
