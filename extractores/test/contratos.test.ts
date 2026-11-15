import { describe, expect, it } from 'vitest'
import { HumedadDistrito, ValorNumero } from '@terraformers/compartido'
import { obtenerDistritos } from '../src/index.ts'
import { aDistrito } from '../src/semillas/distritos.ts'

const base = { unidad: '%', fuente: 'open-meteo-era5land', fecha: '2026-11-11', origen: 'modelo' } as const

describe('Valor', () => {
  it('acepta un valor con su etiqueta', () => {
    expect(ValorNumero.safeParse({ ...base, valor: 47.7 }).success).toBe(true)
  })
  it('rechaza null sin advertencia (nunca un vacío silencioso)', () => {
    expect(ValorNumero.safeParse({ ...base, valor: null }).success).toBe(false)
    expect(ValorNumero.safeParse({ ...base, valor: null, advertencia: 'sin dato' }).success).toBe(true)
  })
  it('rechaza un derivado sin código de regla', () => {
    const d = { ...base, origen: 'derivado', valor: 15.2 }
    expect(ValorNumero.safeParse(d).success).toBe(false)
    expect(ValorNumero.safeParse({ ...d, regla: 'T-01' }).success).toBe(true)
  })
})

describe('HumedadDistrito', () => {
  it('valida el ejemplo de Llano Grande (CR30110) del plan', () => {
    const v = (valor: number, unidad: string, fuente = 'nasa-power', origen = 'satelite') => ({
      valor, unidad, fuente, fecha: '2026-11-11', origen,
    })
    const pendiente = { valor: null, unidad: '', fuente: 'nasa-power', fecha: '2026-11-11', origen: 'derivado', regla: 'EST-01', advertencia: 'linea base pendiente' }
    const registro = {
      codigoDistrito: 'CR30110', nombreDistrito: 'Llano Grande', id: 'CR30110', lat: 9.947, lon: -83.858, fecha: '2026-11-11',
      elevacionM: v(2318, 'm', 'open-meteo-era5land', 'modelo'),
      humedadVolPct: [
        { profundidadCm: { desde: 0, hasta: 7 }, humedadVolPct: v(47.7, '%', 'open-meteo-era5land', 'modelo') },
      ],
      indiceHumedadPower: { superficie: v(0.9, 'fraccion'), raiz: v(0.91, 'fraccion'), perfil: v(0.92, 'fraccion') },
      temperaturaAireC: { ...v(15.2, '°C'), origen: 'derivado', regla: 'T-01' },
      humedadRelativaPct: v(90.2, '%'),
      lluviaMm: v(6.2, 'mm/dia'),
      estado: pendiente,
      percentilMes: { ...pendiente, unidad: 'percentil' },
      riesgoHongos: { nivel: { ...pendiente, regla: 'S-01' }, motivos: [], supuestos: ['S-01', 'S-02', 'S-03'] },
    }
    expect(HumedadDistrito.parse(registro).codigoDistrito).toBe('CR30110')
  })
})

describe('Distritos', () => {
  it('convierte un punto de HDX y deriva cantón y provincia del código', () => {
    const d = aDistrito({
      properties: { adm3_pcode: 'CR30110', adm3_name: 'Llano Grande', adm2_name: 'Cartago', adm1_name: 'Cartago' },
      geometry: { type: 'Point', coordinates: [-83.858123, 9.947276] },
    })
    expect(d).toEqual({
      codigo: 'CR30110', nombre: 'Llano Grande',
      canton: { codigo: 'CR301', nombre: 'Cartago' }, provincia: { codigo: 'CR3', nombre: 'Cartago' },
      lat: 9.94728, lon: -83.85812,
    })
  })
  it('la semilla trae 492 distritos únicos, incluidos los de prueba', () => {
    const ds = obtenerDistritos()
    expect(ds).toHaveLength(492)
    expect(new Set(ds.map((d) => d.codigo)).size).toBe(492)
    for (const c of ['CR30110', 'CR50501', 'CR21011', 'CR60110']) expect(ds.some((d) => d.codigo === c)).toBe(true)
  })
})
