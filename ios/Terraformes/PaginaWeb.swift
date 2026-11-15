import SwiftUI
import WebKit

/// Una vista web por pestaña; todas comparten el mismo origen (app://local), así que comparten
/// la sesión y lo guardado en el aparato (localStorage).
@MainActor @Observable
final class Webs {
    /// Idioma y tema elegidos en Ajustes de la web; la barra nativa los sigue.
    var ingles = Locale.preferredLanguages.first?.hasPrefix("en") ?? false
    var oscuro: Bool?

    @ObservationIgnored private var vistas: [Seccion: WKWebView] = [:]
    @ObservationIgnored private var configuracion = WKWebViewConfiguration()

    init() {
        configuracion = Self.crearConfiguracion()
        configuracion.userContentController.add(Mensajero { [weak self] cuerpo in
            guard let datos = cuerpo as? [String: Any] else { return }
            if let idioma = datos["idioma"] as? String { self?.ingles = idioma == "en" }
            if let tema = datos["tema"] as? String { self?.oscuro = tema == "azul" }
        }, name: "preferencias")
    }

    private static func crearConfiguracion() -> WKWebViewConfiguration {
        let c = WKWebViewConfiguration()
        c.setURLSchemeHandler(ManejadorApp(), forURLScheme: "app")
        // La web oculta su propia barra y botón flotante cuando ve esta marca (ver estilos.css).
        let marca = WKUserScript(source: "document.documentElement.dataset.nativo = '1';",
                                 injectionTime: .atDocumentStart, forMainFrameOnly: true)
        c.userContentController.addUserScript(marca)
        #if DEBUG
        // Muestra en pantalla los errores de JavaScript (solo al desarrollar).
        let errores = WKUserScript(source: """
            function mostrar(t){var d=document.createElement('pre');d.style.cssText='position:fixed;top:60px;left:8px;right:8px;z-index:99;background:#fee;color:#900;font:12px monospace;white-space:pre-wrap;padding:8px';d.textContent=t;(document.body||document.documentElement).appendChild(d);}
            addEventListener('error',function(e){mostrar('ERR '+e.message+' @'+e.filename+':'+e.lineno+' '+(e.target&&e.target.src||''))},true);
            addEventListener('unhandledrejection',function(e){mostrar('REJ '+e.reason)});
            """, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        c.userContentController.addUserScript(errores)
        #endif
        return c
    }

    func vista(_ s: Seccion) -> WKWebView {
        if let v = vistas[s] { return v }
        let v = WKWebView(frame: .zero, configuration: configuracion)
        // Mismo fondo que la web (token `fondo`), para que no se vea una franja blanca al final.
        let fondo = UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(red: 0.04, green: 0.07, blue: 0.13, alpha: 1)   // #0b1120
            : UIColor(red: 0.96, green: 0.95, blue: 0.91, alpha: 1)   // #f4f1e8
        }
        v.isOpaque = false
        v.backgroundColor = fondo
        v.scrollView.backgroundColor = fondo
        v.scrollView.contentInsetAdjustmentBehavior = .always
        v.allowsBackForwardNavigationGestures = true
        #if DEBUG
        v.isInspectable = true   // Safari > Develop > Simulator para depurar
        #endif
        v.load(URLRequest(url: Self.url(s.rawValue)))
        vistas[s] = v
        return v
    }

    /// Lleva la pestaña actual a otra ruta de la web (p. ej. el botón "Reportar una plaga").
    func ir(_ s: Seccion, a ruta: String) {
        vista(s).evaluateJavaScript("location.hash = '#\(ruta)'")
    }

    static func url(_ ruta: String) -> URL {
        URL(string: "app://local/index.html#\(ruta)")!
    }
}

/// Recibe los mensajes de la web (sin retener a Webs, para no crear un ciclo).
final class Mensajero: NSObject, WKScriptMessageHandler {
    let alRecibir: @MainActor (Any) -> Void
    init(_ alRecibir: @escaping @MainActor (Any) -> Void) { self.alRecibir = alRecibir }
    func userContentController(_ c: WKUserContentController, didReceive mensaje: WKScriptMessage) {
        let cuerpo = mensaje.body
        MainActor.assumeIsolated { alRecibir(cuerpo) }
    }
}

struct PaginaWeb: UIViewRepresentable {
    let web: WKWebView
    func makeUIView(context: Context) -> WKWebView { web }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

/// Sirve la web empaquetada (carpeta Web del paquete) bajo app://local/…
/// Un esquema propio en vez de file:// porque WebKit no carga módulos JS desde file://.
final class ManejadorApp: NSObject, WKURLSchemeHandler {
    private let raiz = Bundle.main.resourceURL!.appendingPathComponent("Web").standardizedFileURL

    private static let tipos = [
        "html": "text/html", "js": "text/javascript", "css": "text/css", "svg": "image/svg+xml",
        "jpg": "image/jpeg", "png": "image/png", "json": "application/json", "md": "text/plain",
    ]

    func webView(_ webView: WKWebView, start tarea: WKURLSchemeTask) {
        guard let url = tarea.request.url else { return }
        let ruta = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let archivo = raiz.appendingPathComponent(ruta).standardizedFileURL
        // Solo archivos dentro de la carpeta Web (nada de ../).
        guard archivo.path.hasPrefix(raiz.path + "/"), let datos = try? Data(contentsOf: archivo) else {
            tarea.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let tipo = Self.tipos[archivo.pathExtension.lowercased()] ?? "application/octet-stream"
        let respuesta = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                        // Vite marca sus scripts con crossorigin: sin este encabezado WebKit no los ejecuta.
                                        headerFields: ["Content-Type": tipo, "Content-Length": "\(datos.count)",
                                                       "Access-Control-Allow-Origin": "*"])!
        tarea.didReceive(respuesta)
        tarea.didReceive(datos)
        tarea.didFinish()
    }

    func webView(_ webView: WKWebView, stop tarea: WKURLSchemeTask) {}
}
