# 📧 Envío de certificados por correo (Resend)

El sistema envía el certificado CMALAB en PDF (con el enlace de verificación) al
correo del paciente desde dos lugares:

1. **Botón "📧 Enviar"** en la lista de evaluaciones (`BotonEnviarCorreo`).
2. **Envío automático** al guardar una evaluación (casilla "Enviar certificado
   automáticamente por correo" en el paso 6 del formulario).

Ambos llaman a `POST /api/enviar-certificado`, que genera el PDF (helper
compartido con el visor público) y lo envía a través del API de **Resend**.

---

## 1. Crear la cuenta y la API Key

1. Regístrese en **https://resend.com** (plan gratuito: 100 correos/día, 3000/mes).
2. Entre a **API Keys** → **https://resend.com/api-keys** y cree una clave con
   permiso de envío (`Email send`). Copie el valor (empieza con `re_…`).
3. (Opcional) Integración automática con Vercel:
   **resend.com → Settings → Integrations → Vercel** crea la clave y la guarda
   como `RESEND_API_KEY` en el proyecto de Vercel sin pasos manuales.

## 2. Configurar el dominio de envío (obligatorio para enviar a pacientes)

Resend solo permite enviar desde un **dominio verificado** o desde el dominio de
prueba `onboarding@resend.dev` (y ese último **solo envía a su propia cuenta**).

> ⚠️ **Antes de empezar: el dominio debe estar REGISTRADO y ser suyo.**
> Si el dominio no está registrado, Resend mostrará *"Domain not found: This
> domain wasn't found in any DNS servers yet"* y no hay ningún registro que
> pueda agregar. Verifique su dominio con un buscador WHOIS (p. ej.
> `whois.com`) o consulte si resuelve con `nslookup -type=NS sud dominio.com 8.8.8.8`.
> Para el proyecto SST MedSys el dominio natural es **`crmsalud.com`** (el de la
> empresa, administrado en AWS Route 53).

### 2a. Agregar el dominio en Resend

1. En Resend vaya a **Domains → Add Domain**.
2. Ingrese el dominio (p. ej. `crmsalud.com`) y elija la región
   (para Colombia use **São Paulo (sa-east-1)**).
3. Resend crea el dominio y le muestra la pestaña **Records** con 3–4 registros.

### 2b. Registros DNS que debe crear (copie los valores exactos de Resend)

| Propósito | Tipo | Nombre | Contenido (ejemplo) | TTL |
|---|---|---|---|---|
| DKIM (verificación) | `TXT` | `resend._domainkey` | `p=MIGfMA0GCSqG…` (clave larga, cópiela completa) | Auto |
| SPF – feedback loop | `MX` | `send` | `10 feedback-smtp.sa-east-1.amazonses.com` | Auto |
| SPF | `TXT` | `send` | `v=spf1 include:amazonses.com ~all` | Auto |
| DMARC (opcional) | `TXT` | `_dmarc` | `v=DMARC1; p=none;` | Auto |

> **Cómo se ven en el panel de DNS** (varía según el proveedor):
> - **Route 53 (AWS)** — el DNS de `crmsalud.com` está aquí (sus
>   nameservers son `ns-….awsdns-…`). Vaya a **Hosted Zones → crmsalud.com →
>   Create record** y cree un registro por fila de la tabla. En el registro MX,
>   el **Priority** es `10` y el valor es la parte de `feedback-smtp…` sin el `10`.
> - **Namecheap / GoDaddy / Cloudflare** — use las secciones *Advanced DNS* o
>   *DNS Management* y cree cada registro con el mismo tipo, nombre y contenido.

### 2c. Verificar y activar

1. Cree los registros y espere unos minutos a que el DNS propague.
2. En Resend, abra el dominio y pulse **Verify** (o **Restart verification** si
   ya lo intentó y falló). El estado pasa de `Pending`/`Failed` a **Verified**
   (puede tardar desde minutos hasta unas horas).
3. Solo después de `Verified` podrá enviar usando `@sudominio.com`.

## 3. Configurar las variables de entorno

Copie `.env.example` a `.env.local` y complete:

```bash
# ── Envío de certificados por correo (Resend) ──
RESEND_API_KEY=re_xxxxxxxxxxxx          # API Key de https://resend.com/api-keys
EMAIL_FROM="SST MedSys <no-responder@crmsalud.com>"   # dominio verificado en Resend
```

> **Prueba local**: para que el enlace del correo y el QR apunten a su máquina
> (y no al dominio de producción), agregue también
> `NEXT_PUBLIC_APP_URL=http://localhost:3000` (use el puerto real de `npm run dev`).

Luego **reinicie el servidor** (`npm run dev`). En Vercel, agregue las mismas
variables en **Project → Settings → Environment Variables** y redepliegue.

## 4. Verificar el flujo

### 4a. Prueba rápida sin datos reales (desde su propia cuenta)

Con el dominio todavía sin configurar, puede comprobar el envío de **prueba**
usando el remitente por defecto y enviando a **su propio correo**:

1. Deje `RESEND_API_KEY` con su clave y NO defina `EMAIL_FROM` (usa
   `SST MedSys <onboarding@resend.dev>`).
2. En **Audience → Segments** de Resend verifique/agregue su correo como
   destinatario de prueba (el dominio `resend.dev` solo envía a cuentas
   verificadas de la misma cuenta).
3. En el sistema, cree una evaluación y envíe el certificado a **su propio
   correo**. Debería llegar el PDF adjunto.
4. Una vez verificado el dominio, defina `EMAIL_FROM` y envíe a un paciente real.

### 4b. Errores esperados y su causa

| Error mostrado en la app | Causa y solución |
|---|---|
| *"falta RESEND_API_KEY"* | No está la variable. Agregue la API Key y reinicie. |
| *"Domain not found: This domain wasn't found in any DNS servers yet"* | El dominio **no está registrado** (o el nombre está mal escrito). Verifíquelo con WHOIS; si no es suyo, bórrelo en Resend (botón *Delete domain*) y agregue un dominio que sí posea (p. ej. `crmsalud.com`). |
| *"DNS check failed: All required records are missing"* | Falta crear los registros DNS (tabla 2b) o los creó en el dominio/proveedor equivocado. Créelos y pulse **Restart verification**. |
| *"…verification failed / DKIM not found"* | Los valores copiados están incompletos (la clave DKIM es larga). Borre y vuelva a copiar el valor completo desde Resend. |
| *"…Verifique que el dominio de EMAIL_FROM esté verificado en Resend…"* | `EMAIL_FROM` usa un dominio sin verificar (o `onboarding@resend.dev` a un correo ajeno). Verifique el dominio y use ese mismo en `EMAIL_FROM`. |
| *"Invalid API key"* | La API Key es incorrecta o fue revocada. Genere otra en Resend. |
| *"No se pudo contactar el servicio de correo (Resend)…"* | Problema de red o timeout. Reintente. |
| *"No fue posible generar el PDF del certificado"* | Error al renderizar el PDF. Revise los logs del servidor. |

## 5. Archivos involucrados

- `src/app/api/enviar-certificado/route.tsx` — API que genera el PDF y envía por Resend.
- `src/lib/generar-certificado-pdf.tsx` — render del PDF (compartido con `/ver-examen/[id]/pdf`).
- `src/components/BotonEnviarCorreo.tsx` — botón "📧 Enviar" de la lista de evaluaciones.
- `src/app/dashboard/evaluaciones/nueva/page.tsx` — envío automático al guardar.
- `.env.example` — plantilla de variables de entorno.

## 6. Límites del plan gratuito

- **100 correos/día** y **3.000/mes** (suficiente para pruebas y operación inicial).
- El remitente `onboarding@resend.dev` solo envía a la propia cuenta.
- Para producción masiva considere un plan de pago (mayor límite y reputación).
