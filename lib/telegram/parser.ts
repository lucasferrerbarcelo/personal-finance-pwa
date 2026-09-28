import { Currency, DebtType } from '../supabase/types';

export type ParsedTelegramCommand =
  | {
      type: 'EXPENSE';
      amount: number;
      currency: Currency;
      note: string;
      installments: number;
    }
  | {
      type: 'DEBT';
      debtType: DebtType;
      personName: string;
      amount: number;
      currency: Currency;
      note?: string;
    }
  | {
      type: 'PAYMENT';
      personName: string;
      amount: number;
      currency?: Currency;
      note?: string;
    }
  | {
      type: 'SUMMARY';
    }
  | {
      type: 'HELP';
    }
  | {
      type: 'UNKNOWN';
      rawText: string;
    };

/**
 * Normalizes text and strips extra spaces
 */
function clean(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Parses user message into a structured financial command
 */
export function parseTelegramMessage(text: string): ParsedTelegramCommand {
  const trimmed = clean(text);
  const lower = trimmed.toLowerCase();

  // 1. Help & Start
  if (['/start', '/help', 'ayuda', 'help'].includes(lower)) {
    return { type: 'HELP' };
  }

  // 2. Summary
  if (['/resumen', 'resumen', '/status', 'resumen del mes'].includes(lower)) {
    return { type: 'SUMMARY' };
  }

  // 3. Payment to debt: "pago 10000 deuda juan", "pago 10000 juan", "pague 15000 carlos"
  const paymentRegex = /^(?:pago|pagu[eé]|abono)\s+(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(?:deuda\s+)?(?:a\s+|de\s+)?(.+)$/i;
  const paymentMatch = trimmed.match(paymentRegex);
  if (paymentMatch) {
    const rawAmount = paymentMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const person = clean(paymentMatch[2]);
    const currency: Currency = /(?:usd|u\$s|dolares)/i.test(trimmed) ? 'USD' : 'ARS';
    return {
      type: 'PAYMENT',
      amount,
      currency,
      personName: person,
    };
  }

  // 4. Debt: "debo 50000 mecanico", "le debo 50000 al mecanico"
  const deboRegex = /^(?:le\s+)?debo\s+(\d+(?:[.,]\d+)?)\s*(usd|u\$s|ars|\$)?\s*(?:a\s+|al\s+)?(.+)$/i;
  const deboMatch = trimmed.match(deboRegex);
  if (deboMatch) {
    const rawAmount = deboMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const isUsd = deboMatch[2] && /(?:usd|u\$s)/i.test(deboMatch[2]);
    const person = clean(deboMatch[3]);
    return {
      type: 'DEBT',
      debtType: 'owe',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      personName: person,
    };
  }

  // 5. Debt: "me debe 20000 juan", "me deben 20000 juan"
  const meDebeRegex = /^me\s+deb(?:e|en)\s+(\d+(?:[.,]\d+)?)\s*(usd|u\$s|ars|\$)?\s*(?:de\s+)?(.+)$/i;
  const meDebeMatch = trimmed.match(meDebeRegex);
  if (meDebeMatch) {
    const rawAmount = meDebeMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const isUsd = meDebeMatch[2] && /(?:usd|u\$s)/i.test(meDebeMatch[2]);
    const person = clean(meDebeMatch[3]);
    return {
      type: 'DEBT',
      debtType: 'owed',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      personName: person,
    };
  }

  // 6. Installments: "60000 zapatillas 3 cuotas", "60000 3 cuotas zapatillas"
  const cuotasRegex = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(.+?)\s+(\d+)\s*cuotas?$/i;
  const cuotasMatch = trimmed.match(cuotasRegex);
  if (cuotasMatch) {
    const rawAmount = cuotasMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const note = clean(cuotasMatch[2]);
    const installments = parseInt(cuotasMatch[3], 10);
    const isUsd = /(?:usd|u\$s|dolares)/i.test(trimmed);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note,
      installments: installments > 0 ? installments : 1,
    };
  }

  // Alt cuotas format: "60000 en 3 cuotas zapatillas" or "60000 3 cuotas zapatillas"
  const altCuotasRegex = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(?:en\s+)?(\d+)\s*cuotas?\s*(?:de\s+|para\s+)?(.+)$/i;
  const altCuotasMatch = trimmed.match(altCuotasRegex);
  if (altCuotasMatch) {
    const rawAmount = altCuotasMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const installments = parseInt(altCuotasMatch[2], 10);
    const note = clean(altCuotasMatch[3]);
    const isUsd = /(?:usd|u\$s|dolares)/i.test(trimmed);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note,
      installments: installments > 0 ? installments : 1,
    };
  }

  // 7. USD Expenses: "25 usd hosting", "usd 25 hosting", "25 u$s hosting"
  const usdExpenseRegex1 = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|dolares)\s+(.+)$/i;
  const usdMatch1 = trimmed.match(usdExpenseRegex1);
  if (usdMatch1) {
    const amount = parseFloat(usdMatch1[1].replace(',', '.'));
    return {
      type: 'EXPENSE',
      amount,
      currency: 'USD',
      note: clean(usdMatch1[2]),
      installments: 1,
    };
  }

  const usdExpenseRegex2 = /^(?:usd|u\$s)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/i;
  const usdMatch2 = trimmed.match(usdExpenseRegex2);
  if (usdMatch2) {
    const amount = parseFloat(usdMatch2[1].replace(',', '.'));
    return {
      type: 'EXPENSE',
      amount,
      currency: 'USD',
      note: clean(usdMatch2[2]),
      installments: 1,
    };
  }

  // 8. General Expense: "3500 cafe", "$3500 cafe", "3500 almuerzo con amigos"
  const generalExpenseRegex = /^\$?\s*(\d+(?:[.,]\d+)?)\s+(.+)$/;
  const generalMatch = trimmed.match(generalExpenseRegex);
  if (generalMatch) {
    const amount = parseFloat(generalMatch[1].replace(',', '.'));
    const isUsd = /(?:usd|u\$s)/i.test(generalMatch[2]);
    const note = clean(generalMatch[2].replace(/(?:usd|u\$s|ars|\$)/gi, ''));
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note: note || 'Gasto registrado',
      installments: 1,
    };
  }

  return {
    type: 'UNKNOWN',
    rawText: trimmed,
  };
}
