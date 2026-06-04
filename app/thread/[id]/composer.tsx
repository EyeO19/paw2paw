"use client";

import { useEffect, useState, type KeyboardEvent } from "react";

import { conversationCopy } from "@/lib/copy/conversation";

const MAX_LENGTH = 10_000;

type ComposerProps = {
  disabled: boolean;
  isSubmitting: boolean;
  onSend: (content: string) => void;
  onRegisterClear?: (clear: () => void) => void;
};

export function Composer({
  disabled,
  isSubmitting,
  onSend,
  onRegisterClear,
}: ComposerProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    onRegisterClear?.(() => setValue(""));
  }, [onRegisterClear]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isSubmitting) {
      return;
    }
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-200 bg-white p-4">
      <label className="sr-only" htmlFor="message-composer">
        {conversationCopy.composer.label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          id="message-composer"
          name="content"
          rows={3}
          maxLength={MAX_LENGTH}
          value={value}
          disabled={disabled || isSubmitting}
          placeholder={conversationCopy.composer.placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[4.5rem] flex-1 resize-none rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || isSubmitting || value.trim().length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting
            ? conversationCopy.composer.sending
            : conversationCopy.composer.send}
        </button>
      </div>
    </div>
  );
}
