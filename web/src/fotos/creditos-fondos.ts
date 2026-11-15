// Créditos de las fotos de fondo (web/public/imagenes/fondos/, de Wikimedia Commons).
export const CREDITOS_FONDOS = {
  satelite: {"autor": "NASA Goddard Space Flight Center from Greenbelt, MD, USA", "licencia": "Public domain", "url": "https://commons.wikimedia.org/wiki/File:Costa_Rica_(14214278247).jpg"},
  dron: {"autor": "Christopher Hedreyd - PIA 4A CALABARZON", "licencia": "Public domain", "url": "https://commons.wikimedia.org/wiki/File:IRRI_BBM_rice_drone_demo_2.jpg"},
  ndvi: {"autor": "Antarsih", "licencia": "CC BY 4.0", "url": "https://commons.wikimedia.org/wiki/File:Agricultural_art.jpg"},
  cafetal: {"autor": "Pigment-Ink", "licencia": "CC BY-SA 4.0", "url": "https://commons.wikimedia.org/wiki/File:Coffee_plantations_on_the_Camino_de_Costa_Rica.jpg"},
} as const;

export type Fondo = keyof typeof CREDITOS_FONDOS;
