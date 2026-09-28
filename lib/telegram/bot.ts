/**
 * Telegram Bot API client helper
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN is not defined in environment');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Telegram Bot] Failed to send message:', response.status, errText);
      // Fallback: retry without markdown if markdown parsing failed
      if (parseMode === 'Markdown' && errText.includes('can\'t parse entities')) {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text.replace(/[*_`\[\]]/g, ''),
          }),
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
