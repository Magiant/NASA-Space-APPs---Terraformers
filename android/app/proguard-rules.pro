# El puente con la web (solo en teléfonos con WebView viejo) usa @JavascriptInterface: no renombrarlo.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
