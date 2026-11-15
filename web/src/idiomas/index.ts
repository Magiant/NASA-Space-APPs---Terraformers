import { en } from './en';
import { es, type Textos } from './es';

export type Idioma = 'es' | 'en';
export type { Textos };

export const IDIOMAS: Record<Idioma, Textos> = { es, en };
