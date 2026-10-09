import { Currency, DebtType, PaymentMethod } from '../supabase/types';

export type ParsedTelegramCommand =
  | {
      type: 'INCOME';
      amount: number;
      currency: Currency;
      note: string;
      suggestedCategory: string;
      paymentMethod: PaymentMethod;
      hasExplicitMethod: boolean;
    }
  | {
      type: 'EXPENSE';
      amount: number;
      currency: Currency;
      note: string;
      installments: number;
      paymentMethod: PaymentMethod;
      hasExplicitMethod: boolean;
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
      type: 'DEBTS_SUMMARY';
    }
  | {
      type: 'PAYMENT';
      personName: string;
      amount: number;
      currency?: Currency;
      note?: string;
      actionType?: 'pay' | 'collect';
      paymentMethod?: PaymentMethod;
      hasExplicitMethod?: boolean;
    }
  | {
      type: 'SUMMARY';
    }
  | {
      type: 'TODAY';
    }
  | {
      type: 'WEEK';
    }
  | {
      type: 'SET_BUDGET';
      amount: number;
    }
  | {
      type: 'DELETE_DEBT';
      personName?: string;
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

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extracts payment method from text and returns cleaned string without payment keywords
 */
export function extractPaymentMethod(text: string): {
  method: PaymentMethod;
  cleaned: string;
  hasExplicitMethod: boolean;
} {
  const patterns: [RegExp, PaymentMethod][] = [
    [/\b(?:en|con)?\s*(efectivo|cash)\b/i, 'efectivo'],
    [/\b(?:con|en|por)?\s*(tarjeta\s+de\s+d[eé]bito|tarjeta\s+d[eé]bito|d[eé]bito|debito)\b/i, 'tarjeta_debito'],
    [/\b(?:con|en|por)?\s*(tarjeta\s+de\s+cr[eé]dito|tarjeta\s+cr[eé]dito|cr[eé]dito|credito|visa|mastercard|master|amex|tarjeta)\b/i, 'tarjeta_credito'],
    [/\b(?:por|con|en)?\s*(transferencia|transf|mercadopago|mp)\b/i, 'transferencia'],
  ];

  for (const [regex, method] of patterns) {
    if (regex.test(text)) {
      const cleaned = clean(text.replace(regex, ''));
      return { method, cleaned, hasExplicitMethod: true };
    }
  }

  return { method: 'transferencia', cleaned: clean(text), hasExplicitMethod: false };
}

function parseAmountNumber(val: string): number {
  let cleanVal = val.trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleanVal)) {
    cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleanVal)) {
    cleanVal = cleanVal.replace(/,/g, '');
  } else {
    cleanVal = cleanVal.replace(',', '.');
  }
  return parseFloat(cleanVal) || 0;
}

/**
 * Extracts payment method for income (cash, bank, transfer, mercado pago)
 */
export function extractIncomePaymentMethod(text: string): {
  method: PaymentMethod;
  cleaned: string;
  hasExplicitMethod: boolean;
} {
  const patterns: [RegExp, PaymentMethod][] = [
    [/\b(efectivo|cash|billetes|en\s+mano)\b/i, 'efectivo'],
    [/\b(banco|bancaria|cuenta\s+bancaria|galicia|santander|bbva|macro|nacion|nación|itau|brubank)\b/i, 'transferencia'],
    [/\b(mercadopago|mercado\s+pago|mp)\b/i, 'transferencia'],
    [/\b(transferencia|transf|transfer)\b/i, 'transferencia'],
  ];

  for (const [regex, method] of patterns) {
    if (regex.test(text)) {
      const cleaned = clean(text.replace(regex, ''));
      return { method, cleaned, hasExplicitMethod: true };
    }
  }

  return { method: 'transferencia', cleaned: clean(text), hasExplicitMethod: false };
}

/**
 * Detects and parses an INCOME transaction if present.
 * Keywords: "ingreso", "cobre", "cobré", "me transfirieron", "entraron", "depósito", "deposito", "sueldo", "pago recibido"
 * Or command: /ingreso <monto> <concepto>
 */
export function tryParseIncome(text: string): ParsedTelegramCommand | null {
  const trimmed = clean(text);
  const norm = normalize(trimmed);

  const isCommand = /^\/?ingreso\b/i.test(trimmed);
  const hasIncomeKeyword = /(?:^|\s)(ingreso|ingresos|cobre|me\s+transfirieron|transfirieron|entraron|deposito|sueldo|pago\s+recibido)(?:\s|[.,;:!¡¿?]|$)/i.test(norm);

  if (!isCommand && !hasIncomeKeyword) {
    return null;
  }

  // Ensure it's not a debt payment like "pago 10000 deuda juan" unless it has "pago recibido"
  if (/^pago\s+\d/i.test(trimmed) && !/pago\s+recibido/i.test(trimmed)) {
    return null;
  }

  // Currency detection
  const isUsd = /(?:usd|u\$s|dolares|dólares)/i.test(trimmed);
  const currency: Currency = isUsd ? 'USD' : 'ARS';

  // Amount extraction: supports "$ 250.000", "250000", "150.000,50", "100 usd"
  const amountMatch = trimmed.match(/(?:(?:\$|u\$s|usd)\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)(?:\s*(?:usd|u\$s|dolares|dólares|\$))?/i);
  if (!amountMatch) {
    return null;
  }

  const rawAmount = amountMatch[1];
  const amount = parseAmountNumber(rawAmount);
  if (amount <= 0) {
    return null;
  }

  // Remove the matched amount from remaining text
  const remaining = trimmed.replace(amountMatch[0], ' ');

  // Payment method extraction
  const { method, cleaned: textAfterMethod, hasExplicitMethod } = extractIncomePaymentMethod(remaining);

  // Remove income trigger keywords to extract the pure concept/note
  let noteText = textAfterMethod
    .replace(/^\/?ingreso\b/i, '')
    .replace(/(?:^|\s)(?:ingreso|ingresos|cobr[eé]|cobre|cobré|me\s+transfirieron|transfirieron|entraron|dep[oó]sito|deposito|depósito|pago\s+recibido)(?:\s|$)/gi, ' ')
    .replace(/(?:usd|u\$s|dolares|dólares|ars|\$)/gi, ' ')
    .trim();

  // Clean prepositions at start or end (e.g. "de", "en", "por")
  noteText = noteText.replace(/^(?:de|en|por|un|una|el|la)\s+/i, '').replace(/\s+(?:de|en|por)$/i, '').trim();

  let concept = clean(noteText);
  if (!concept) {
    if (/\bsueldo\b/i.test(norm)) concept = 'Sueldo';
    else if (/\bdeposito\b/i.test(norm)) concept = 'Depósito';
    else if (/\b(me\s+transfirieron|transfirieron|entraron)\b/i.test(norm)) concept = 'Transferencia recibida';
    else if (/\bcobre\b/i.test(norm)) concept = 'Cobro';
    else if (/\bpago\s+recibido\b/i.test(norm)) concept = 'Pago recibido';
    else concept = 'Ingreso';
  } else {
    if (/\bsueldo\b/i.test(norm) && !/sueldo/i.test(concept)) {
      concept = ('Sueldo ' + concept).trim();
    }
  }

  concept = concept.charAt(0).toUpperCase() + concept.slice(1);

  // Suggested category: 'Sueldo', 'Ventas', 'Honorarios', 'Transferencia' o 'Otros Ingresos'
  let suggestedCategory = 'Otros Ingresos';
  if (/\b(sueldo|salario|nomina|nómina|quincena|aguinaldo)\b/i.test(norm)) {
    suggestedCategory = 'Sueldo';
  } else if (/\b(venta|ventas|vendi|vendí|comprador|producto)\b/i.test(norm)) {
    suggestedCategory = 'Ventas';
  } else if (/\b(honorario|honorarios|freelance|factura|consultor|consultoria|consultoría|servicio|servicios|cliente|proyecto|clase|clases)\b/i.test(norm)) {
    suggestedCategory = 'Honorarios';
  } else if (/\b(transferencia|transf|me\s+transfirieron|transfirieron|entraron|deposito)\b/i.test(norm)) {
    suggestedCategory = 'Transferencia';
  }

  return {
    type: 'INCOME',
    amount,
    currency,
    note: concept,
    suggestedCategory,
    paymentMethod: method,
    hasExplicitMethod,
  };
}

function cleanPersonName(name: string): string {
  let res = clean(name);
  res = res.replace(/^(?:a|al|de|para|con|la|el|por|en)\s+/i, '');
  res = res.replace(/\s+(?:a|al|de|para|con|por|en)$/i, '');
  res = res.replace(/\bdeuda\b/gi, '').trim();
  res = res.replace(/^(?:a|al|de)\s+/i, '').trim();
  res = res.replace(/\s+(?:a|al|de|para|con|por|en)$/i, '');
  return clean(res);
}

/**
 * Detects and parses debt payments or debt collections (both paying someone or collecting money owed)
 * Examples:
 * - "Le pagué 5000 a Juan por transferencia" -> actionType: 'pay', amount: 5000, person: 'Juan', method: 'transferencia'
 * - "Juan me devolvió 5000 por transferencia" -> actionType: 'collect', amount: 5000, person: 'Juan', method: 'transferencia'
 * - "Juan me pagó 5000 efectivo" -> actionType: 'collect', amount: 5000, person: 'Juan', method: 'efectivo'
 * - "Me devolvió 5000 Juan por transferencia" -> actionType: 'collect', amount: 5000, person: 'Juan', method: 'transferencia'
 * - "Cobré 5000 de Juan por transferencia" -> actionType: 'collect', amount: 5000, person: 'Juan', method: 'transferencia'
 * - "Pago 10000 deuda juan" -> actionType: 'pay', amount: 10000, person: 'juan'
 */
export function tryParseDebtPayment(text: string): ParsedTelegramCommand | null {
  const trimmed = clean(text);

  // Exclude non-debt commands or standard income words
  if (/^(?:\/)?(?:ingreso|sueldo)\b/i.test(trimmed)) return null;
  if (/^(?:le\s+)?debo\b/i.test(trimmed)) return null;
  if (/^me\s+deb(?:e|en)\b/i.test(trimmed)) return null;

  const isUsd = /(?:usd|u\$s|dolares|dólares)/i.test(trimmed);
  const currency: Currency = isUsd ? 'USD' : 'ARS';

  // 1. Pattern: "[Persona] me devolvió/pagó/transfirió [monto] [resto/método]"
  const personMePattern = /^([a-záéíóúñA-ZÁÉÍÓÚÑ\s]+?)\s+me\s+(?:devolvi[oó]|pag[oó]|transfiri[oó])\s+(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?(?:\s+(.*))?$/i;
  const match1 = trimmed.match(personMePattern);
  if (match1) {
    const rawPerson = match1[1];
    const amount = parseAmountNumber(match1[2]);
    const rawRest = match1[3] || '';
    const { method, hasExplicitMethod } = extractPaymentMethod(rawRest);
    const personName = cleanPersonName(rawPerson);
    if (personName && amount > 0) {
      return {
        type: 'PAYMENT',
        actionType: 'collect',
        amount,
        currency,
        personName,
        paymentMethod: method,
        hasExplicitMethod,
      };
    }
  }

  // 2. Pattern: "Me devolvió/pagó/transfirió [monto] [Persona] [resto/método]"
  const mePatternAmountFirst = /^me\s+(?:devolvi[oó]|pag[oó]|transfiri[oó])\s+(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s+(.+)$/i;
  const match2 = trimmed.match(mePatternAmountFirst);
  if (match2) {
    const amount = parseAmountNumber(match2[1]);
    const rawRest = match2[2];
    const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(rawRest);
    const personName = cleanPersonName(cleaned);
    if (personName && amount > 0) {
      return {
        type: 'PAYMENT',
        actionType: 'collect',
        amount,
        currency,
        personName,
        paymentMethod: method,
        hasExplicitMethod,
      };
    }
  }

  // 3. Pattern: "Me devolvió/pagó/transfirió [Persona] [monto] [resto/método]"
  const mePatternPersonFirst = /^me\s+(?:devolvi[oó]|pag[oó]|transfiri[oó])\s+([a-záéíóúñA-ZÁÉÍÓÚÑ\s]+?)\s+(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?(?:\s+(.*))?$/i;
  const match3 = trimmed.match(mePatternPersonFirst);
  if (match3) {
    const rawPerson = match3[1];
    const amount = parseAmountNumber(match3[2]);
    const rawRest = match3[3] || '';
    const { method, hasExplicitMethod } = extractPaymentMethod(rawRest);
    const personName = cleanPersonName(rawPerson);
    if (personName && amount > 0) {
      return {
        type: 'PAYMENT',
        actionType: 'collect',
        amount,
        currency,
        personName,
        paymentMethod: method,
        hasExplicitMethod,
      };
    }
  }

  // 4. Pattern: "Cobré/cobre/cobro [deuda] [monto] [de/a] [Persona] [resto/método]"
  const cobrePattern = /^(?:cobr[eé]|cobro)\s+(?:deuda\s+)?(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(?:deuda\s+)?(?:de\s+|a\s+)?(.+)$/i;
  const match4 = trimmed.match(cobrePattern);
  if (match4) {
    const amount = parseAmountNumber(match4[1]);
    const rawRest = match4[2];
    const isSalaryIncome = /\b(sueldo|salario|nomina|nómina|quincena|aguinaldo|honorarios?|ventas?|freelance|factura|alquiler|jubilacion)\b/i.test(rawRest);
    if (!isSalaryIncome) {
      const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(rawRest);
      const personName = cleanPersonName(cleaned);
      if (personName && amount > 0) {
        return {
          type: 'PAYMENT',
          actionType: 'collect',
          amount,
          currency,
          personName,
          paymentMethod: method,
          hasExplicitMethod,
        };
      }
    }
  }

  // 5. Pattern: "(Le) pagué/pague/pago/aboné/abone/abono/devolví/devolvi a [Persona] [monto] [resto/método]"
  const payPersonFirstPattern = /^(?:le\s+)?(?:pago|pagu[eé]|abono|abon[eé]|devolv[ií])\s+(?:a\s+|al\s+)([a-záéíóúñA-ZÁÉÍÓÚÑ\s]+?)\s+(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?(?:\s+(.*))?$/i;
  const match5 = trimmed.match(payPersonFirstPattern);
  if (match5) {
    const rawPerson = match5[1];
    const amount = parseAmountNumber(match5[2]);
    const rawRest = match5[3] || '';
    const { method, hasExplicitMethod } = extractPaymentMethod(rawRest);
    const personName = cleanPersonName(rawPerson);
    if (personName && amount > 0) {
      return {
        type: 'PAYMENT',
        actionType: 'pay',
        amount,
        currency,
        personName,
        paymentMethod: method,
        hasExplicitMethod,
      };
    }
  }

  // 6. Pattern: "(Le) pagué/pague/pago/aboné/abone/abono/devolví/devolvi [monto] (a/al/deuda) [Persona] [resto/método]"
  const payAmountFirstPattern = /^(?:le\s+)?(?:pago|pagu[eé]|abono|abon[eé]|devolv[ií])\s+(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(?:deuda\s+)?(?:a\s+|al\s+|de\s+)?(.+)$/i;
  const match6 = trimmed.match(payAmountFirstPattern);
  if (match6) {
    const amount = parseAmountNumber(match6[1]);
    const rawRest = match6[2];
    const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(rawRest);
    const personName = cleanPersonName(cleaned);
    if (personName && amount > 0) {
      return {
        type: 'PAYMENT',
        actionType: 'pay',
        amount,
        currency,
        personName,
        paymentMethod: method,
        hasExplicitMethod,
      };
    }
  }

  return null;
}

/**
 * Parses user message into a structured financial command
 */
export function parseTelegramMessage(text: string): ParsedTelegramCommand {
  const trimmed = clean(text);
  const lower = trimmed.toLowerCase();

  // 1. Help & Start
  if (['/start', '/help', 'ayuda', 'help', '/comandos'].includes(lower)) {
    return { type: 'HELP' };
  }

  // 2. Today's expenses: "/hoy", "hoy", "gastos hoy", "gastos de hoy"
  if (['/hoy', 'hoy', '/gastoshoy', 'gastos hoy', 'gastos de hoy'].includes(lower)) {
    return { type: 'TODAY' };
  }

  // 3. Week's expenses: "/semana", "semana", "esta semana", "gastos semana"
  if (['/semana', 'semana', '/semanal', 'esta semana', 'gastos semana', 'gastos de la semana'].includes(lower)) {
    return { type: 'WEEK' };
  }

  // 4. Set budget: "/setpresupuesto 600000", "/setpresupuesto $600.000", "/presupuesto 600000"
  const setBudgetRegex = /^(?:\/setpresupuesto|setpresupuesto|\/presupuesto)\s+\$?\s*([\d.,]+)$/i;
  const setBudgetMatch = trimmed.match(setBudgetRegex);
  if (setBudgetMatch) {
    const amount = parseAmountNumber(setBudgetMatch[1]);
    if (amount > 0) {
      return { type: 'SET_BUDGET', amount };
    }
  }

  // 5. Month Summary: "/mes", "mes", "/resumen", "resumen", "/status", "resumen del mes", "/presupuesto"
  if (['/mes', 'mes', '/resumen', 'resumen', '/status', 'resumen del mes', 'este mes', 'gastos del mes', '/presupuesto', 'presupuesto'].includes(lower)) {
    return { type: 'SUMMARY' };
  }

  // 6. Debts list: "/deudas", "deudas", "/misdeudas"
  if (['/deudas', 'deudas', '/misdeudas'].includes(lower)) {
    return { type: 'DEBTS_SUMMARY' };
  }

  // 6.1 Delete debt: "/borrardeuda [persona]", "borrar deuda [persona]", "eliminar deuda [persona]", "/eliminardeuda [persona]"
  const deleteDebtRegex = /^(?:\/)?(?:borrar|eliminar)\s*(?:_|\s*)deuda(?:s)?(?:\s+(?:a\s+|de\s+|con\s+)?(.+))?$/i;
  const deleteDebtMatch = trimmed.match(deleteDebtRegex);
  if (deleteDebtMatch) {
    const person = deleteDebtMatch[1] ? clean(deleteDebtMatch[1]) : '';
    return {
      type: 'DELETE_DEBT',
      personName: person || undefined,
    };
  }

  // 6.2 Payment to debt or collect debt:
  // "Le pagué 5000 a Juan por transferencia", "Juan me devolvió 5000 por transferencia", "Cobré 5000 de Juan", "pago 10000 juan"
  const debtPaymentCommand = tryParseDebtPayment(trimmed);
  if (debtPaymentCommand) {
    return debtPaymentCommand;
  }

  // 5. Debt: "debo 50000 mecanico", "le debo 50000 al mecanico"
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

  // 6. Debt: "me debe 20000 juan", "me deben 20000 juan"
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

  // 7. Income detection: /ingreso, cobre, cobré, me transfirieron, entraron, depósito, sueldo, pago recibido
  const incomeCommand = tryParseIncome(trimmed);
  if (incomeCommand) {
    return incomeCommand;
  }

  // 8. Installments: "60000 zapatillas 3 cuotas", "60000 zapatillas 3 cuotas credito", "60000 zapatillas 3c", "60000 3c zapatillas"
  const cuotasRegex = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(.+?)\s+(\d+)\s*(?:cuotas?|c)\b(?:\s+(.+))?$/i;
  const cuotasMatch = trimmed.match(cuotasRegex);
  if (cuotasMatch) {
    const rawAmount = cuotasMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const rawNote = clean(`${cuotasMatch[2]} ${cuotasMatch[4] || ''}`);
    const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(rawNote);
    const installments = parseInt(cuotasMatch[3], 10);
    const isUsd = /(?:usd|u\$s|dolares)/i.test(trimmed);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note: cleaned || 'Compra en cuotas',
      installments: installments > 0 ? installments : 1,
      paymentMethod: hasExplicitMethod ? method : (installments > 1 ? 'tarjeta_credito' : method),
      hasExplicitMethod: hasExplicitMethod || installments > 1,
    };
  }

  // Alt cuotas format: "60000 en 3 cuotas zapatillas credito", "60000 en 3c zapatillas", "60000 3 cuotas zapatillas"
  const altCuotasRegex = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|ars|\$)?\s*(?:en\s+)?(\d+)\s*(?:cuotas?|c)\b\s*(?:de\s+|para\s+)?(.+)$/i;
  const altCuotasMatch = trimmed.match(altCuotasRegex);
  if (altCuotasMatch) {
    const rawAmount = altCuotasMatch[1].replace(',', '.');
    const amount = parseFloat(rawAmount);
    const installments = parseInt(altCuotasMatch[2], 10);
    const rawNote = clean(altCuotasMatch[3]);
    const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(rawNote);
    const isUsd = /(?:usd|u\$s|dolares)/i.test(trimmed);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note: cleaned || 'Compra en cuotas',
      installments: installments > 0 ? installments : 1,
      paymentMethod: hasExplicitMethod ? method : (installments > 1 ? 'tarjeta_credito' : method),
      hasExplicitMethod: hasExplicitMethod || installments > 1,
    };
  }

  // 8. USD Expenses: "25 usd hosting", "usd 25 hosting debito", "25 u$s hosting efectivo"
  const usdExpenseRegex1 = /^(\d+(?:[.,]\d+)?)\s*(?:usd|u\$s|dolares)\s+(.+)$/i;
  const usdMatch1 = trimmed.match(usdExpenseRegex1);
  if (usdMatch1) {
    const amount = parseFloat(usdMatch1[1].replace(',', '.'));
    const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(usdMatch1[2]);
    return {
      type: 'EXPENSE',
      amount,
      currency: 'USD',
      note: cleaned || 'Gasto USD',
      installments: 1,
      paymentMethod: method,
      hasExplicitMethod,
    };
  }

  const usdExpenseRegex2 = /^(?:usd|u\$s)\s+(\d+(?:[.,]\d+)?)\s+(.+)$/i;
  const usdMatch2 = trimmed.match(usdExpenseRegex2);
  if (usdMatch2) {
    const amount = parseFloat(usdMatch2[1].replace(',', '.'));
    const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(usdMatch2[2]);
    return {
      type: 'EXPENSE',
      amount,
      currency: 'USD',
      note: cleaned || 'Gasto USD',
      installments: 1,
      paymentMethod: method,
      hasExplicitMethod,
    };
  }

  // 9. General Expense: "3500 cafe", "3500 cafe efectivo", "12000 nafta debito", "$3500 cafe"
  const generalExpenseRegex = /^\$?\s*(\d+(?:[.,]\d+)?)\s+(.+)$/;
  const generalMatch = trimmed.match(generalExpenseRegex);
  if (generalMatch) {
    const amount = parseFloat(generalMatch[1].replace(',', '.'));
    const isUsd = /(?:usd|u\$s)/i.test(generalMatch[2]);
    const rawNote = clean(generalMatch[2].replace(/(?:usd|u\$s|ars|\$)/gi, ''));
    const { method, cleaned, hasExplicitMethod } = extractPaymentMethod(rawNote);
    return {
      type: 'EXPENSE',
      amount,
      currency: isUsd ? 'USD' : 'ARS',
      note: cleaned || 'Gasto registrado',
      installments: 1,
      paymentMethod: method,
      hasExplicitMethod,
    };
  }

  return {
    type: 'UNKNOWN',
    rawText: trimmed,
  };
}
