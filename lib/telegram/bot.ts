/**
 * Telegram Bot API client helper
 */

export interface TelegramKeyboardOptions {
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: {
    inline_keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
    keyboard?: Array<Array<{ text: string }>>;
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
  };
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  optionsOrParseMode?: 'Markdown' | 'HTML' | TelegramKeyboardOptions
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN is not defined in environment');
    return false;
  }

  let parseMode: 'Markdown' | 'HTML' = 'Markdown';
  let replyMarkup: any = undefined;

  if (typeof optionsOrParseMode === 'string') {
    parseMode = optionsOrParseMode;
  } else if (optionsOrParseMode && typeof optionsOrParseMode === 'object') {
    if (optionsOrParseMode.parseMode) parseMode = optionsOrParseMode.parseMode;
    if (optionsOrParseMode.replyMarkup) replyMarkup = optionsOrParseMode.replyMarkup;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Telegram Bot] Failed to send message:', response.status, errText);
      // Fallback: retry without markdown if markdown parsing failed
      if (parseMode === 'Markdown' && errText.includes("can't parse entities")) {
        const fallbackPayload: any = {
          chat_id: chatId,
          text: text.replace(/[*_`\[\]]/g, ''),
        };
        if (replyMarkup) fallbackPayload.reply_markup = replyMarkup;

        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload),
        });
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram Bot] Network or fetch error:', error);
    return false;
  }
}

export async function editTelegramMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  options?: TelegramKeyboardOptions
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN is not defined in environment');
    return false;
  }

  const parseMode = options?.parseMode ?? 'Markdown';
  const replyMarkup = options?.replyMarkup;

  try {
    const url = `https://api.telegram.org/bot${token}/editMessageText`;
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: parseMode,
    };
    if (replyMarkup !== undefined) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Telegram Bot] Failed to edit message:', response.status, errText);
      if (parseMode === 'Markdown' && errText.includes("can't parse entities")) {
        const fallbackPayload: any = {
          chat_id: chatId,
          message_id: messageId,
          text: text.replace(/[*_`\[\]]/g, ''),
        };
        if (replyMarkup !== undefined) fallbackPayload.reply_markup = replyMarkup;

        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload),
        });
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram Bot] Network or fetch error in editTelegramMessageText:', error);
    return false;
  }
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN is not defined in environment');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const payload: any = {
      callback_query_id: callbackQueryId,
      show_alert: showAlert,
    };
    if (text) {
      payload.text = text;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('[Telegram Bot] Network error in answerTelegramCallbackQuery:', error);
    return false;
  }
}
