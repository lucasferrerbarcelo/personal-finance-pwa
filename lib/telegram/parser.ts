import { Currency, DebtType, PaymentMethod } from '../supabase/types';

export type ParsedTelegramCommand =
  | {
      type: 'EXPENSE';
      amount: number;
      currency: Currency;
      note: string;
      installments: number;
      paymentMethod: PaymentMethod;
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
 * Extracts payment method from text and returns cleaned string without payment keywords
 */
export function extractPaymentMethod(text: string): { method: PaymentMethod; cleaned: string } {
  const patterns: [RegExp, PaymentMethod][] = [
    [/\b(efectivo|cash)\b/i, 'efectivo'],
    [/\b(tarjeta\s+de\s+d[eé]bito|tarjeta\s+d[eé]bito|d[eé]bito|debito)\b/i, 'tarjeta_debito'],
    [/\b(tarjeta\s+de\s+cr[eé]dito|tarjeta\s+cr[eé]dito|cr[eé]dito|credito|visa|mastercard|master|amex|tarjeta)\b/i, 'tarjeta_credito'],
    [/\b(transferencia|transf|mercadopago|mp)\b/i, 'transferencia'],
  ];

  for (const [regex, method] of patterns) {
    if (regex.test(text)) {
      const cleaned = clean(text.replace(regex, ''));
      return { method, cleaned };
    }
  }

  return { method: 'transferencia', cleaned: clean(text) };
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

  // 6. Installments: "60000 zapatillas 3 cuotas", "60000 zapatillas 3 cuotas credito", "60000 3 cuotas zapatillas"
  const cuotasRegex = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(.+?)\s+(\d+)\s*cuotas?(?:\s+(.+))?$/i;
  const cuotasMatch = trimmed.match(cuotasRegex);
  if (cuotasMatch) {
    const rawAmount = cuotasMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const rawNote = clean(`${cuotasMatch[2]} ${cuotasMatch[4] || ''}`);
    const { method, cleaned } = extractPaymentMethod(rawNote);
    const installments = parseInt(cuotasMatch[3], 10);
    const isUsd = /(?:usd|u\$s|dolares)/i.test(trimmed);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note: cleaned || 'Compra en cuotas',
      installments: installments > 0 ? installments : 1,
      paymentMethod: method,
    };
  }

  // Alt cuotas format: "60000 en 3 cuotas zapatillas credito" or "60000 3 cuotas zapatillas"
  const altCuotasRegex = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(?:en\s+)?(\d+)\s*cuotas?\s*(?:de\s+|para\s+)?(.+)$/i;
  const altCuotasMatch = trimmed.match(altCuotasRegex);
  if (altCuotasMatch) {
    const rawAmount = altCuotasMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const installments = parseInt(altCuotasMatch[2], 10);
    const rawNote = clean(altCuotasMatch[3]);
    const { method, cleaned } = extractPaymentMethod(rawNote);
    const isUsd = /(?:usd|u\$s|dolares)/i.test(trimmed);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note: cleaned || 'Compra en cuotas',
      installments: installments > 0 ? installments : 1,
      paymentMethod: method,
    };
  }

  // 7. USD Expenses: "25 usd hosting", "usd 25 hosting debito", "25 u$s hosting efectivo"
  const usdExpenseRegex1 = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|dolares)\s+(.+)$/i;
  const usdMatch1 = trimmed.match(usdExpenseRegex1);
  if (usdMatch1) {
    const amount = parseFloat(usdMatch1[1].replace(',', '.'));
    const { method, cleaned } = extractPaymentMethod(usdMatch1[2]);
    return {
      type: 'EXPENSE',
      amount,
      currency: 'USD',
      note: cleaned || 'Gasto USD',
      installments: 1,
      paymentMethod: method,
    };
  }

  const usdExpenseRegex2 = /^(?:usd|u\$s)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/i;
  const usdMatch2 = trimmed.match(usdExpenseRegex2);
  if (usdMatch2) {
    const amount = parseFloat(usdMatch2[1].replace(',', '.'));
    const { method, cleaned } = extractPaymentMethod(usdMatch2[2]);
    return {
      type: 'EXPENSE',
      amount,
      currency: 'USD',
      note: cleaned || 'Gasto USD',
      installments: 1,
      paymentMethod: method,
    };
  }

  // 8. General Expense: "3500 cafe", "3500 cafe efectivo", "12000 nafta debito", "$3500 cafe"
  const generalExpenseRegex = /^\$?\s*(\d+(?:[.,]\d+)?)\s+(.+)$/;
  const generalMatch = trimmed.match(generalExpenseRegex);
  if (generalMatch) {
    const amount = parseFloat(generalMatch[1].replace(',', '.'));
    const isUsd = /(?:usd|u\$s)/i.test(generalMatch[2]);
    const rawNote = clean(generalMatch[2].replace(/(?:usd|u\$s|ars|\$)/gi, ''));
    const { method, cleaned } = extractPaymentMethod(rawNote);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note: cleaned || 'Gasto registrado',
      installments: 1,
      paymentMethod: method,
    };
  }

  return {
    type: 'UNKNOWN',
    rawText: trimmed,
  };
}
