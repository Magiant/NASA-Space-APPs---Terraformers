import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

// La web compilada (web/dist) se copia dentro de la app en cada compilación, así funciona sin internet.
// Antes hay que compilar la web:  npm run build  (en la raíz del repo) o  ./preparar-web.sh
val webDist = rootProject.layout.projectDirectory.dir("../web/dist")
val webAssets = layout.buildDirectory.dir("generated/web")

val copiarWeb by tasks.registering(Copy::class) {
    description = "Copia la web compilada (web/dist) dentro de la app."
    val indice = webDist.file("index.html").asFile
    doFirst {
        if (!indice.exists()) {
            throw GradleException("Falta la web compilada en web/dist. Corra antes  npm run build  en la raíz del repo (o android/preparar-web.sh).")
        }
    }
    from(webDist)
    into(webAssets)
    exclude("**/.*")
}

android {
    namespace = "cr.terrafarm.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "cr.terrafarm.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    // Firma de la versión para publicar: la llave del equipo llega por variables de entorno (en GitHub,
    // desde los secretos; ver .github/workflows/android.yml). Nunca va en el repo.
    val llave = System.getenv("TERRAFARM_KEYSTORE")
    if (llave != null) {
        signingConfigs.create("equipo") {
            storeFile = file(llave)
            storePassword = System.getenv("TERRAFARM_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("TERRAFARM_KEY_ALIAS")
            keyPassword = System.getenv("TERRAFARM_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (llave != null) signingConfig = signingConfigs.getByName("equipo")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    sourceSets["main"].assets.srcDir(webAssets.get().asFile)
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

tasks.named("preBuild") { dependsOn(copiarWeb) }

dependencies {
    val compose = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(compose)
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.webkit:webkit:1.12.1")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
