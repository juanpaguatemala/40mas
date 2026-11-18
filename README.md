# 24 más — Guía para llevar el duelo

App web (Next.js) de **«24 más, cada día tiene su propio afán»**, de Juan Pablo Mata
(Apostolado Católico Hechos / BienCatólicos). 40 días de lectura con la narración del autor,
preguntas para responder y diario personal.

## Cómo funciona para el participante

1. Entra con su cuenta de Google. Su avance y sus respuestas quedan en su cuenta.
2. El día 1 está abierto sin costo.
3. Da su ofrenda de Q40.00 en QPayPro y registra en la app su número de autorización.
4. Tú apruebas la ofrenda en `/admin` y se abre su camino.
5. Un día a la vez: cuando termina un día, el siguiente se abre a partir del día siguiente (hora de Guatemala).
   Las dos lecturas del día 25 se abren juntas.

El texto del libro nunca está en las páginas públicas: el servidor lo entrega solo a quien ya tiene ese día abierto.

---

## Configuración (una sola vez)

### 1. Firebase

1. Entra a https://console.firebase.google.com y crea un proyecto (por ejemplo `24-mas`). Google Analytics no es necesario.
2. **Authentication → Comenzar → Método de acceso → Google → Habilitar.** Elige tu correo de asistencia y guarda.
3. **Firestore Database → Crear base de datos →** modo producción, ubicación `nam5` o la más cercana.
4. En Firestore → **Reglas**, pega el contenido de `firestore.rules` y publica (bloquea todo acceso directo desde el navegador).
5. **Configuración del proyecto (engranaje) → General → Tus apps → Agregar app → Web (`</>`).** Copia `apiKey`, `authDomain`, `projectId` y `appId`.
6. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.** Se descarga un archivo JSON: de ahí salen `client_email` y `private_key`. Guárdalo en un lugar seguro y no lo subas a GitHub.

### 2. Vercel

1. Sube esta carpeta a un repositorio de GitHub (el `.gitignore` ya excluye lo que no debe subirse).
2. En Vercel: **Add New → Project →** importa el repositorio (framework Next.js).
3. En **Settings → Environment Variables** agrega las variables de `.env.example`:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | apiKey (paso 1.5) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | authDomain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | projectId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | appId |
| `FIREBASE_PROJECT_ID` | projectId |
| `FIREBASE_CLIENT_EMAIL` | `client_email` del JSON (paso 1.6) |
| `FIREBASE_PRIVATE_KEY` | `private_key` del JSON, completa, con los `\n` |
| `ADMIN_EMAILS` | correos que pueden aprobar ofrendas, separados por comas |

4. **Deploy.**
5. De vuelta en Firebase → **Authentication → Configuración → Dominios autorizados**, agrega tu dominio de Vercel
   (por ejemplo `24-mas.vercel.app`) y tu dominio propio si lo usas.

No configures `DATOS_EN_MEMORIA` ni `NEXT_PUBLIC_USE_EMULATORS` en Vercel: son solo para pruebas locales.

### 3. Aprobar ofrendas

Entra a `https://tu-dominio/admin` con un correo de `ADMIN_EMAILS`. Compara cada número de autorización con
tus cobros en el panel de QPayPro y pulsa **Aprobar** (o **Rechazar**). Desde «Aprobadas» puedes quitar el acceso.

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y completa los valores
npm run dev
```

Para probar sin un proyecto real de Firebase: emulador de Authentication y datos en memoria.

```bash
npx firebase emulators:start --only auth --project demo-24mas
# .env.local:
#   NEXT_PUBLIC_USE_EMULATORS=1  NEXT_PUBLIC_FIREBASE_API_KEY=demo  NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-24mas
#   FIREBASE_PROJECT_ID=demo-24mas  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099  DATOS_EN_MEMORIA=1
```

Prueba de las reglas de desbloqueo: `node --experimental-strip-types scripts/desbloqueo.test.mts`

## Estructura

| Archivo | Qué contiene |
|---|---|
| `lib/server/capitulos.json` | Texto del libro extraído del PDF (41 lecturas). Solo lo lee el servidor. |
| `lib/indice.json`, `lib/publico.json` | Títulos (públicos), introducción y oración por los difuntos. |
| `lib/desbloqueo.ts` | Reglas de avance: día 1 libre, ofrenda, un día por día. |
| `lib/server/cuenta.ts`, `lib/server/almacen.ts` | Cuentas, ofrendas y respuestas en Firestore. |
| `app/api/*` | Estado, lectura, completar día, respuestas, ofrenda y administración. |
| `lib/audios.ts` | Catálogo de audios en Cloudflare R2, vinculado a cada lectura. |
| `components/AudioPlayer.tsx` | Reproductor con ±15 s, velocidad, progreso y «Narrado por Juan Pablo Mata». |
| `scripts/verificar-audios.mjs` | Comprueba que cada URL de audio responde con MP3. |
| `scripts/extraer-libro.py` | Regenera el texto desde el PDF (`pip install pymupdf`). |

## Datos en Firestore

- `usuarios/{uid}`: correo, nombre, `acceso` (ofrenda aprobada) y `completados` (lectura → fecha).
- `usuarios/{uid}/respuestas/{lectura}`: lo que escribe el participante.
- `ofrendas/{uid}`: número de autorización, comentario, estado y quién la revisó.

## Audios

- 25 archivos verificados (días 1–7, 9–24 y los dos del 25). Faltan el día 8 y los días 26–40.
- Para agregar uno: en `lib/audios.ts` cambia `pendiente(N, 'id')` por `a(N, 'TITULO DEL ARCHIVO', bytes, n2(N), 'id')`.
- Las URL usan el dominio público `r2.dev`: quien tenga el enlace puede descargar el MP3. Antes de vender a gran
  escala conviene servirlos con URLs firmadas desde `/api/lectura`.
