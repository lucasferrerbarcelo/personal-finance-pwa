import { parseTelegramMessage } from '../lib/telegram/parser';

const tests = [
  '3500 cafe',
  '3500 cafe efectivo',
  '12000 nafta debito',
  '60000 zapatillas 3 cuotas credito',
  '25 usd hosting',
  'debo 50000 mecanico',
  'me debe 20000 juan',
  'pago 10000 deuda juan',
  '/resumen',
  '/deudas',
  '/hoy',
  '/semana',
  '/mes',
  '/setpresupuesto 600000',
  '/setpresupuesto $750.000',
];

console.log('--- Testing Telegram Message Parser with Payment Methods ---');
for (const test of tests) {
  const result = parseTelegramMessage(test);
  console.log(`[Input]: "${test}"`);
  console.log(`[Result]:`, JSON.stringify(result, null, 2));
  console.log('-----------------------------------------------------------');
}
