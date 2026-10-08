import { GoogleGenerativeAI } from '@google/generative-ai';
import { PaymentMethod } from '../supabase/types';
import { findBestCategory } from '../categories/matcher';

export interface ParsedVoiceExpense {
  type?: 'expense' | 'income';
  amount: number;
  currency: 'ARS' | 'USD';
  concept: string;
  payment_method: PaymentMethod;
  category_id: string | null;
  category_name: string | null;
  installments: number;
  rawTranscription?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isTransientError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.statusCode;
  return (
    status === 503 ||
    status === 429 ||
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('temporarily')
  );
}

export async function processVoiceNoteWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
  categories: Array<{ id: string; name: string }>
): Promise<ParsedVoiceExpense | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('ACA_PEGAS') || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  }

  const categoryNames = categories.map(c => c.name);

  // Normalize mime type for Gemini audio input
  let cleanMimeType = (mimeType.split(';')[0] || 'audio/ogg').trim().toLowerCase();
  if (cleanMimeType === 'audio/oga' || cleanMimeType.includes('oga') || cleanMimeType.includes('opus')) {
    cleanMimeType = 'audio/ogg';
  } else if (!cleanMimeType.startsWith('audio/')) {
    cleanMimeType = 'audio/ogg';
  }

  const prompt = `
Eres un asistente financiero y contable altamente preciso.
Tu tarea es escuchar el audio adjunto en español, transcribirlo e interpretar la información del gasto para estructurarlo en formato JSON.

Lista de categorías existentes disponibles:
[${categoryNames.map(c => `"${c}"`).join(', ')}]

Instrucciones de interpretación:
1. "amount": número positivo con el monto total del gasto (ej: 3500, 12000, 45.5). Si dice "tres mil quinientos" es 3500.
2. "currency": "ARS" por defecto. Si menciona explícitamente "dólares", "dolar" o "usd", usar "USD".
3. "concept": descripción corta y concisa del gasto (ej: "Café con medialunas", "Nafta", "Cena con amigos", "Zapatillas").
4. "payment_method": uno de los siguientes valores exactos:
   - "efectivo" (si dice efectivo, cash, billetes)
   - "tarjeta_debito" (si dice débito, tarjeta de débito)
   - "tarjeta_credito" (si dice crédito, tarjeta de crédito, visa, mastercard, amex)
   - "transferencia" (si dice transferencia, mercado pago, mp, transf o si no especifica ningún método)
5. "category_name": el nombre EXACTO de la categoría de la lista proporcionada que mejor corresponda al concepto.
6. "type": "income" si la persona menciona un ingreso (ej: cobré, me pagaron, me transfirieron, sueldo, honorarios, depósito, entraron, venta), o "expense" para cualquier gasto regular.
7. "installments": número entero de cuotas (por defecto 1, o el número mencionado si dice ej: "3 cuotas", "en 6 pagos").
8. "raw_transcription": transcripción literal de lo que dijo el usuario.

Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "type": "expense",
  "amount": 3500,
  "currency": "ARS",
  "concept": "Café con medialunas",
  "payment_method": "efectivo",
  "category_name": "Salidas y Comida",
  "installments": 1,
  "raw_transcription": "gasté tres mil quinientos en un café con medialunas en efectivo"
}
`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const base64Audio = audioBuffer.toString('base64');

  // Candidate models: start with gemini-3.8-flash, fallback to stable models
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-flash-latest',
  ];

  let responseText = '';
  let lastError: any = null;

  for (const modelName of candidateModels) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const executeCall = async () => {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: cleanMimeType,
            data: base64Audio,
          },
        },
      ]);
      return result.response.text();
    };

    try {
      responseText = await executeCall();
      if (responseText) {
        break; // Succeeded!
      }
    } catch (err: any) {
      console.warn(`[Gemini Voice] Model ${modelName} initial attempt failed:`, err?.message || err);
      lastError = err;

      // 1. Retry with 1.5s delay if transient (503 / 429 / high demand)
      if (isTransientError(err)) {
        console.info(`[Gemini Voice] Waiting 1.5s to retry on ${modelName}...`);
        await delay(1500);

        try {
          responseText = await executeCall();
          if (responseText) {
            break; // Succeeded on retry!
          }
        } catch (retryErr: any) {
          console.warn(`[Gemini Voice] Model ${modelName} retry also failed:`, retryErr?.message || retryErr);
          lastError = retryErr;
        }
      }

      // If this model didn't succeed, proceed to next candidate model
      continue;
    }
  }

  if (!responseText) {
    if (isTransientError(lastError)) {
      throw new Error('GEMINI_HIGH_DEMAND');
    }
    throw lastError || new Error('Gemini devolvió una respuesta vacía.');
  }

  // Parse JSON safely
  const cleanJson = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const data = JSON.parse(cleanJson);

  const amount = Number(data.amount) || 0;
  const currency: 'ARS' | 'USD' = data.currency === 'USD' ? 'USD' : 'ARS';
  const concept = (data.concept || 'Gasto por audio').trim();

  let paymentMethod: PaymentMethod = 'transferencia';
  if (['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'otro'].includes(data.payment_method)) {
    paymentMethod = data.payment_method;
  }

  const installments = Math.max(1, parseInt(data.installments, 10) || 1);

  // Match category
  let matchedCat = categories.find(
    c => c.name.toLowerCase() === (data.category_name || '').toLowerCase()
  );

  if (!matchedCat) {
    matchedCat = findBestCategory(concept, categories) || undefined;
  }

  const rawTranscription = data.raw_transcription || '';
  const isIncome =
    data.type === 'income' ||
    /(?:^|\s)(ingreso|ingresos|cobre|cobré|me\s+transfirieron|transfirieron|entraron|deposito|depósito|sueldo|pago\s+recibido)(?:\s|[.,;:!¡¿?]|$)/i.test(
      `${concept} ${rawTranscription}`
    );

  return {
    type: isIncome ? 'income' : 'expense',
    amount,
    currency,
    concept,
    payment_method: paymentMethod,
    category_id: matchedCat?.id || null,
    category_name: matchedCat?.name || null,
    installments,
    rawTranscription,
  };
}
