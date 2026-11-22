import { useT } from '../../contexto/PreferenciasContext';
import { CREDITOS_FOTOS } from '../../fotos/creditos-cultivos';
import { CREDITOS_FONDOS } from '../../fotos/creditos-fondos';
import { CREDITOS_ALERTAS, CREDITOS_PLAGAS } from '../../fotos/creditos-plagas';
import { nombreCultivo, nombrePlaga } from '../../utilidades';

type Credito = { autor: string; licencia: string; url: string };

/**
 * Créditos de las fotos (Wikimedia Commons). Las licencias CC BY y CC BY-SA piden nombrar al autor y la licencia;
 * en vez de ponerlo debajo de cada foto, va todo aquí, enlazado desde el pie de página.
 */
export default function Creditos() {
  const t = useT();
  const tc = t.creditos;
  const grupos: { titulo: string; filas: [string, Credito][] }[] = [
    { titulo: tc.cultivos, filas: Object.entries(CREDITOS_FOTOS).map(([id, c]) => [nombreCultivo(t, id), c]) },
    { titulo: tc.plagas, filas: Object.entries(CREDITOS_PLAGAS).map(([id, c]) => [nombrePlaga(t, id), c]) },
    { titulo: tc.alertas, filas: Object.entries(CREDITOS_ALERTAS).map(([id, c]) => [tc.nombres[id] ?? id, c]) },
    { titulo: tc.fondos, filas: Object.entries(CREDITOS_FONDOS).map(([id, c]) => [tc.nombres[id] ?? id, c]) },
  ];

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{tc.titulo}</h1>
        <p>{tc.intro}</p>
      </header>
      <div className="creditos">
        {grupos.map((g) => (
          <section key={g.titulo} className="tarjeta">
            <h2>{g.titulo}</h2>
            <ul>
              {g.filas.map(([nombre, c]) => (
                <li key={nombre + c.url}>
                  <strong>{nombre}</strong>: <a href={c.url} target="_blank" rel="noreferrer">{c.autor}</a> · {c.licencia}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
