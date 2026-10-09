import { Category } from '../supabase/types';

interface CategoryMatchRule {
  categoryNames: string[];
  keywords: string[];
}

const CATEGORY_RULES: CategoryMatchRule[] = [
  {
    categoryNames: ['Supermercado', 'Super', 'Comestibles'],
    keywords: [
      'super', 'supermercado', 'coto', 'carrefour', 'dia', 'dia%', 'chino',
      'jumbo', 'disco', 'vea', 'chango', 'changomas', 'makro', 'vital',
      'almacen', 'verduleria', 'carniceria', 'panaderia', 'fiambreria',
      'queseria', 'pescaderia', 'despensa', 'mercado', 'kiosco', 'maxikiosco'
    ],
  },
  {
    categoryNames: ['Salidas y Comida', 'Comida', 'Restaurantes', 'Gastronomía'],
    keywords: [
      'cafe', 'cafeteria', 'starbucks', 'havanna', 'medialuna', 'almuerzo',
      'cena', 'desayuno', 'merienda', 'bar', 'cerveza', 'birra', 'hamburguesa',
      'burger', 'mcdonalds', 'mostaza', 'wendys', 'pizza', 'pizzeria',
      'empanadas', 'sushi', 'helado', 'heladeria', 'grido', 'freddo',
      'pedidosya', 'rappi', 'resto', 'restaurante', 'parrilla', 'bodegon',
      'tragos', 'boliche', 'cocktail', 'comida'
    ],
  },
  {
    categoryNames: ['Transporte y Combustible', 'Transporte', 'Combustible', 'Vehículo'],
    keywords: [
      'nafta', 'combustible', 'ypf', 'shell', 'axion', 'puma', 'gnc',
      'uber', 'cabify', 'didi', 'taxi', 'remis', 'sube', 'peaje',
      'estacionamiento', 'colectivo', 'subte', 'tren', 'bondi', 'mecanico',
      'taller', 'lavadero', 'gomeria', 'service', 'vtv', 'auto', 'moto'
    ],
  },
  {
    categoryNames: ['Servicios e Impuestos', 'Servicios', 'Impuestos', 'Hogar'],
    keywords: [
      'luz', 'edenor', 'edesur', 'gas', 'metrogas', 'naturgy', 'aysa', 'agua',
      'internet', 'fibertel', 'telecentro', 'personal flow', 'flow', 'claro',
      'movistar', 'tuenti', 'abl', 'inmobiliario', 'rentas', 'arba', 'afip',
      'monotributo', 'ingresos brutos', 'expensas', 'seguro', 'patente',
      'alquiler', 'visa', 'mastercard'
    ],
  },
  {
    categoryNames: ['Salud y Farmacia', 'Salud', 'Farmacia', 'Medicina'],
    keywords: [
      'farmacia', 'farmacity', 'remedio', 'medicamento', 'medico', 'doctor',
      'dentista', 'odontologo', 'psicologo', 'terapia', 'consulta', 'analisis',
      'estudio', 'optica', 'anteojos', 'lentes', 'osde', 'swiss medical',
      'galeno', 'omint', 'prepaga', 'sanatorio', 'hospital', 'clinica'
    ],
  },
  {
    categoryNames: ['Indumentaria', 'Ropa', 'Moda'],
    keywords: [
      'zapatillas', 'zapatos', 'ropa', 'remera', 'pantalon', 'jean', 'camisa',
      'buzo', 'campera', 'short', 'malla', 'medias', 'calzoncillo', 'boxer',
      'vestido', 'pollera', 'nike', 'adidas', 'puma', 'zara', 'h&m', 'levis',
      'indumentaria'
    ],
  },
  {
    categoryNames: ['Tecnología y Gadgets', 'Tecnología', 'Electrónica'],
    keywords: [
      'hosting', 'dominio', 'cloud', 'aws', 'vercel', 'github', 'openai',
      'apple', 'iphone', 'ipad', 'macbook', 'pc', 'computadora', 'notebook',
      'monitor', 'teclado', 'mouse', 'auriculares', 'airpods', 'gadget',
      'celular', 'telefono', 'cable', 'cargador', 'hardware'
    ],
  },
  {
    categoryNames: ['Entretenimiento', 'Ocio', 'Diversión'],
    keywords: [
      'netflix', 'spotify', 'youtube', 'disney', 'max', 'hbo', 'prime video',
      'apple tv', 'cine', 'pelicula', 'hoyts', 'cinemark', 'teatro', 'recital',
      'concierto', 'show', 'fiesta', 'evento', 'entrada', 'juego', 'videojuego',
      'steam', 'playstation', 'ps5', 'xbox', 'nintendo'
    ],
  },
  {
    categoryNames: ['Educación', 'Cursos', 'Estudios'],
    keywords: [
      'facultad', 'universidad', 'uba', 'uade', 'colegio', 'escuela', 'matricula',
      'cuota colegio', 'curso', 'capacitacion', 'libro', 'libros', 'libreria',
      'udemy', 'platzi', 'coderhouse', 'idioma', 'ingles', 'profesor'
    ],
  },
  {
    categoryNames: ['Deudas', 'Préstamos', 'Prestamos'],
    keywords: [
      'deuda', 'deudas', 'prestamo', 'prestamos', 'pago deuda', 'abono deuda', 'debo', 'debia'
    ],
  },
];

/**
 * Normalizes text removing accents and non-alphanumeric chars
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Intelligently finds the best category matching a transaction note/concept
 */
export function findBestCategory(
  concept: string,
  categories: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  if (!concept || categories.length === 0) return null;

  const normalizedConcept = normalize(concept);
  const words = normalizedConcept.split(/\s+/);

  // 1. Direct match with existing category names
  for (const cat of categories) {
    const normCatName = normalize(cat.name);
    if (normalizedConcept.includes(normCatName) || normCatName.includes(normalizedConcept)) {
      return cat;
    }
  }

  // 2. Keyword rules matching
  for (const rule of CATEGORY_RULES) {
    const matchedCategory = categories.find(cat => {
      const normCatName = normalize(cat.name);
      return rule.categoryNames.some(target => normCatName.includes(normalize(target)));
    });

    if (matchedCategory) {
      // Check if any rule keyword matches whole word or substring
      for (const kw of rule.keywords) {
        const normKw = normalize(kw);
        // Whole word or boundary match
        const regex = new RegExp(`\\b${normKw}\\b`, 'i');
        if (regex.test(normalizedConcept) || words.includes(normKw)) {
          return matchedCategory;
        }
      }
    }
  }

  // 3. Substring keyword check
  for (const rule of CATEGORY_RULES) {
    const matchedCategory = categories.find(cat => {
      const normCatName = normalize(cat.name);
      return rule.categoryNames.some(target => normCatName.includes(normalize(target)));
    });

    if (matchedCategory) {
      for (const kw of rule.keywords) {
        if (normalizedConcept.includes(normalize(kw))) {
          return matchedCategory;
        }
      }
    }
  }

  // 4. Fallback to "Otros Gastos" or first available
  const otros = categories.find(c => normalize(c.name).includes('otro'));
  return otros || null;
}

/**
 * Intelligently finds the best category matching an income note/concept
 * Supports suggested categories: 'Sueldo', 'Ventas', 'Honorarios', 'Transferencia' or 'Otros Ingresos'
 */
export function findBestIncomeCategory(
  concept: string,
  suggestedName: string,
  categories: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  if (!categories || categories.length === 0) return null;

  // 1. Direct match with suggestedName (e.g. 'Sueldo', 'Ventas', 'Honorarios', 'Transferencia', 'Otros Ingresos')
  const directMatch = categories.find(
    c => normalize(c.name) === normalize(suggestedName)
  );
  if (directMatch) return directMatch;

  // 2. Partial match with suggestedName
  const partialMatch = categories.find(
    c => normalize(c.name).includes(normalize(suggestedName)) ||
         normalize(suggestedName).includes(normalize(c.name))
  );
  if (partialMatch) return partialMatch;

  // 3. Match concept with debt collection keywords
  const conceptNorm = normalize(concept);
  if (/\b(deuda|devolvi|devolvio|cobro|prestamo)\b/i.test(conceptNorm)) {
    const debtCat = categories.find(c => normalize(c.name).includes('deuda'));
    if (debtCat) return debtCat;
  }

  // 4. Match using concept words
  for (const cat of categories) {
    const catNorm = normalize(cat.name);
    if (conceptNorm.includes(catNorm) || catNorm.includes(conceptNorm)) {
      return cat;
    }
  }

  // 5. Fallback to "Otros Ingresos" or first available category
  const otros = categories.find(c => normalize(c.name).includes('otro'));
  return otros || categories[0] || null;
}

