import SwiftUI

/// Las cinco secciones de la web, cada una con su ruta (HashRouter: app://local/index.html#/precios).
enum Seccion: String, CaseIterable, Hashable {
    case sembrar = "/sembrar"   // "/" es la página de módulos (Inicio)
    case precios = "/precios"
    case alertas = "/alertas"
    case cursos = "/capacitaciones"
    case finca = "/mi-finca"
}

/// Verde bosque de la marca (tokens `primario`, claro y oscuro).
private let primario = Color(UIColor { $0.userInterfaceStyle == .dark
    ? UIColor(red: 0.37, green: 0.76, blue: 0.49, alpha: 1)   // #5fc27d
    : UIColor(red: 0.12, green: 0.35, blue: 0.21, alpha: 1)   // #1f5a35
})

/// Cascarón nativo: iOS dibuja la barra de pestañas y el botón de acción con vidrio líquido real;
/// el contenido de cada pestaña es la web empaquetada dentro de la app (funciona sin internet).
struct ContentView: View {
    @State private var seccion: Seccion = .sembrar
    @State private var webs = Webs()

    /// Mismo idioma que eligió la persona en Ajustes (la web lo avisa).
    private func texto(_ es: String, _ en: String) -> String { webs.ingles ? en : es }

    var body: some View {
        TabView(selection: $seccion) {
            Tab(texto("Sembrar", "Plant"), systemImage: "leaf", value: .sembrar) { pagina(.sembrar) }
            Tab(texto("Precios", "Prices"), systemImage: "chart.bar", value: .precios) { pagina(.precios) }
            Tab(texto("Alertas", "Alerts"), systemImage: "exclamationmark.triangle", value: .alertas) { pagina(.alertas) }
            Tab(texto("Cursos", "Courses"), systemImage: "graduationcap", value: .cursos) { pagina(.cursos) }
            Tab(texto("Mi finca", "My farm"), systemImage: "house", value: .finca) { pagina(.finca) }
        }
        .tint(primario)
        // Mismo tema que en Ajustes (nil = el del teléfono).
        .preferredColorScheme(webs.oscuro.map { $0 ? .dark : .light })
        // Accesorio sobre la barra: en iOS 26 se dibuja como una cápsula de vidrio líquido.
        .tabViewBottomAccessory {
            Button {
                webs.ir(seccion, a: "/reportar-plaga")
            } label: {
                Label(texto("Reportar una plaga", "Report a pest"), systemImage: "ladybug")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .tint(primario)
            .accessibilityHint("Abre el formulario para reportar una plaga")
        }
    }

    private func pagina(_ s: Seccion) -> some View {
        // El contenido pasa por debajo del vidrio (así se ve el efecto); la web recibe el margen como safe area.
        PaginaWeb(web: webs.vista(s)).ignoresSafeArea(.container, edges: .bottom)
    }
}
