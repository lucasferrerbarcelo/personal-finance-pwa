import { parseTelegramMessage } from '../lib/telegram/parser';

const tests = [
  '3500 cafe',
  '25 usd hosting',
  '60000 zapatillas 3 cuotas',
  'debo 50000 mecanico',
  'me debe 20000 juan',
  'pago 10000 deuda juan',
  '/resumen',
];

console.log('--- Testing Telegram Message Parser ---');
for (const test of tests) {
  const result = parseTelegramMessage(test);
  console.log(`[Input]: "${test}"`);
  console.log(`[Result]:`, JSON.stringify(result, null, 2));
  console.log('--------------------------------------');
}
