import { GoogleGenerativeAI } from '@google/generative-ai';
import { PaymentMethod } from '../supabase/types';
import { findBestCategory } from '../categories/matcher';

export interface ParsedReceiptExpense {
  amount: number;
  currency: 'ARS' | 'USD';
  concept: string;
  payment_method: PaymentMethod;
  category_id: string | null;
  category_name: string | null;
  confidence: 'high' | 'low';
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

export async function processReceiptImageWithGemini(
  imageBuffer: Buffer,
  mimeType: string,
  categories: Array<{ id: string; name: string }>
): Promise<ParsedReceiptExpense | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('ACA_PEGAS') || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  }

  const categoryNames = categories.map(c => c.name);

  // Normalize image mime type
  let cleanMimeType = (mimeType.split(';')[0] || 'image/jpeg').trim().toLowerCase();
  if (!cleanMimeType.startsWith('image/')) {
    cleanMimeType = 'image/jpeg';
  }

  const prompt = `
Eres un asistente contable experto en OCR y procesamiento de tickets, facturas, comprobantes fiscales y tickets de posnet en español (especialmente de Argentina y Latinoamérica).
Analiza detalladamente la imagen adjunta y extrae la información financiera en formato JSON.

Lista de categorías existentes disponibles:
[${categoryNames.map(c => `"${c}"`).join(', ')}]

Instrucciones estrictas para la extracción:
1. "amount": busca el importe "TOTAL", "TOTAL A PAGAR", "IMPORTE TOTAL", "IMPORTE FINAL", "SALDO TOTAL", "VENTA" o el monto final efectivamente cobrado.
   - NUNCA tomes como monto números de CUIT/CUIL, DNI, número de comprobante, punto de venta, código de barras, vuelto/cambio o subtotales sin impuestos.
   - Si los decimales están indicados con coma o punto, conviértelo a un número flotante válido positivo (ej: 4500.50). Si no hay monto identificable, pon 0.
2. "currency": "ARS" por defecto. Usa "USD" si el ticket menciona explícitamente dólares, USD o U$S.
3. "concept": nombre del comercio o razón social (ej: "Supermercado Coto", "Farmacity", "YPF", "McDonald's", "Librería Yenny"). Si no se lee el comercio, un resumen breve de los artículos principales.
4. "payment_method":
   - "efectivo" (si dice efectivo, cash, contado)
   - "tarjeta_debito" (si dice débito, visa débito, maestro, electron, cabal débito)
   - "tarjeta_credito" (si dice crédito, visa crédito, mastercard, amex, tarjeta, cuotas)
   - "transferencia" (si dice mercado pago, mp, qr, transferencia, debin o si no se indica el método)
5. "category_name": la categoría más adecuada de la lista proporcionada según el tipo de comercio o productos (ej: supermercados -> Supermercado, estaciones de servicio -> Transporte y Combustible, farmacias -> Salud y Farmacia, restaurantes/cafés -> Salidas y Comida, indumentaria -> Indumentaria).
6. "confidence": "high" si encontraste claramente el total y el ticket es legible; "low" si la imagen está borrosa, cortada o no parece un comprobante de pago.

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  "amount": 3500.50,
  "currency": "ARS",
  "concept": "Supermercado Coto",
  "payment_method": "tarjeta_debito",
  "category_name": "Supermercado",
  "confidence": "high"
}
`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const base64Image = imageBuffer.toString('base64');

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
            data: base64Image,
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
      console.warn(`[Gemini Receipt] Model ${modelName} initial attempt failed:`, err?.message || err);
      lastError = err;

      // 1. Retry with 1.5s delay if transient (503 / 429 / high demand)
      if (isTransientError(err)) {
        console.info(`[Gemini Receipt] Waiting 1.5s to retry on ${modelName}...`);
        await delay(1500);

        try {
          responseText = await executeCall();
          if (responseText) {
            break; // Succeeded on retry!
          }
        } catch (retryErr: any) {
          console.warn(`[Gemini Receipt] Model ${modelName} retry also failed:`, retryErr?.message || retryErr);
          lastError = retryErr;
        }
      }

      // If this model didn't succeed, continue to next model
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
  const concept = (data.concept || 'Ticket de compra').trim();

  let paymentMethod: PaymentMethod = 'transferencia';
  if (['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'otro'].includes(data.payment_method)) {
    paymentMethod = data.payment_method;
  }

  const confidence: 'high' | 'low' = data.confidence === 'low' ? 'low' : 'high';

  // Match category
  let matchedCat = categories.find(
    c => c.name.toLowerCase() === (data.category_name || '').toLowerCase()
  );

  if (!matchedCat) {
    matchedCat = findBestCategory(concept, categories) || undefined;
  }

  return {
    amount,
    currency,
    concept,
    payment_method: paymentMethod,
    category_id: matchedCat?.id || null,
    category_name: matchedCat?.name || null,
    confidence,
  };
}
