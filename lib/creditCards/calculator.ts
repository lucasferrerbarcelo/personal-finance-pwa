/**
 * Credit Card Statement Cycle & Settlement Calculator
 */

export interface StatementCycleInfo {
  statementMonth: string; // 'YYYY-MM'
  statementMonthName: string; // e.g. "Noviembre 2026"
  dueDay: number; // e.g. 5
  closingDay: number; // e.g. 24
  dueDateStr: string; // e.g. "2026-11-05"
  closingDateStr: string; // e.g. "2026-10-24"
  closingDisplay: string; // e.g. "24/10"
}

export function formatStatementMonthName(statementMonthStr: string): string {
  const [yearStr, monthStr] = statementMonthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (!year || !month) return statementMonthStr;

  const d = new Date(year, month - 1, 1);
  const monthName = d.toLocaleDateString('es-AR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

/**
 * Calculates the statement month and due date for a credit card purchase.
 * 
 * Rules:
 * - If purchase_day <= closing_day -> statement_month = mes_siguiente (1 month ahead)
 * - If purchase_day > closing_day  -> statement_month = mes_subsiguiente (2 months ahead)
 */
export function calculateStatementCycle(
  purchaseDateStr: string,
  closingDay: number = 24,
  dueDay: number = 5
): StatementCycleInfo {
  const [year, month, day] = purchaseDateStr.split('-').map(Number);

  // Month offset from purchase month:
  // if <= closing_day: closes this month, due next month (+1)
  // if > closing_day: closes next month, due 2 months ahead (+2)
  const dueMonthOffset = day <= closingDay ? 1 : 2;
  const closingMonthOffset = day <= closingDay ? 0 : 1;

  // Due Date & Statement Month
  const dueDateObj = new Date(year, month - 1 + dueMonthOffset, 1);
  const dueYear = dueDateObj.getFullYear();
  const dueMonthNum = dueDateObj.getMonth() + 1;
  const statementMonth = `${dueYear}-${String(dueMonthNum).padStart(2, '0')}`;

  const daysInDueMonth = new Date(dueYear, dueMonthNum, 0).getDate();
  const actualDueDay = Math.min(dueDay, daysInDueMonth);
  const dueDateStr = `${statementMonth}-${String(actualDueDay).padStart(2, '0')}`;

  // Closing Date
  const closingDateObj = new Date(year, month - 1 + closingMonthOffset, 1);
  const closingYear = closingDateObj.getFullYear();
  const closingMonthNum = closingDateObj.getMonth() + 1;
  const daysInClosingMonth = new Date(closingYear, closingMonthNum, 0).getDate();
  const actualClosingDay = Math.min(closingDay, daysInClosingMonth);
  const closingDateStr = `${closingYear}-${String(closingMonthNum).padStart(2, '0')}-${String(actualClosingDay).padStart(2, '0')}`;
  const closingDisplay = `${String(actualClosingDay).padStart(2, '0')}/${String(closingMonthNum).padStart(2, '0')}`;

  return {
    statementMonth,
    statementMonthName: formatStatementMonthName(statementMonth),
    dueDay: actualDueDay,
    closingDay: actualClosingDay,
    dueDateStr,
    closingDateStr,
    closingDisplay,
  };
}

/**
 * Calculates statement cycles for N consecutive installments.
 */
export function calculateInstallmentStatementCycles(
  purchaseDateStr: string,
  totalInstallments: number,
  closingDay: number = 24,
  dueDay: number = 5
): StatementCycleInfo[] {
  const baseCycle = calculateStatementCycle(purchaseDateStr, closingDay, dueDay);
  const [baseYear, baseMonth] = baseCycle.statementMonth.split('-').map(Number);

  const cycles: StatementCycleInfo[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    const targetDate = new Date(baseYear, baseMonth - 1 + i, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const statementMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const actualDueDay = Math.min(dueDay, daysInMonth);
    const dueDateStr = `${statementMonth}-${String(actualDueDay).padStart(2, '0')}`;

    // Closing date is 1 month prior to due date
    const prevClosingDate = new Date(targetYear, targetMonth - 2, 1);
    const prevClosingYear = prevClosingDate.getFullYear();
    const prevClosingMonth = prevClosingDate.getMonth() + 1;
    const daysInPrevClosingMonth = new Date(prevClosingYear, prevClosingMonth, 0).getDate();
    const actualClosingDay = Math.min(closingDay, daysInPrevClosingMonth);
    const closingDateStr = `${prevClosingYear}-${String(prevClosingMonth).padStart(2, '0')}-${String(actualClosingDay).padStart(2, '0')}`;
    const closingDisplay = `${String(actualClosingDay).padStart(2, '0')}/${String(prevClosingMonth).padStart(2, '0')}`;

    cycles.push({
      statementMonth,
      statementMonthName: formatStatementMonthName(statementMonth),
      dueDay: actualDueDay,
      closingDay: actualClosingDay,
      dueDateStr,
      closingDateStr,
      closingDisplay,
    });
  }

  return cycles;
}
