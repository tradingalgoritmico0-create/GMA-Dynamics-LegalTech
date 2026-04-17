# QA AUDIT REPORT — GMA DYNAMICS LEGALTECH
**Proyecto:** AbogadosPaginaWeb  
**Auditor:** QA & Security Engineer (Zero-Trust LegalTech)  
**Fecha:** 2026-04-16  
**VEREDICTO: BLOQUEADO PARA PRODUCCIÓN — 4 issues CRÍTICOS sin resolver.**

---

## RESUMEN EJECUTIVO

| ID | Severidad | Archivo | Línea |
|---|---|---|---|
| BUG-001 | CRÍTICO | supabase_final_schema_v2.sql | 54 |
| BUG-002 | CRÍTICO | supabase_final_schema_v2.sql | 116 |
| BUG-003 | CRÍTICO | Dashboard.tsx | 119 |
| BUG-004 | CRÍTICO | .env | 9 |
| BUG-005 | ALTO | Dashboard.tsx | 119 |
| BUG-006 | ALTO | Dashboard.tsx | 109 |
| BUG-007 | ALTO | Dashboard.tsx | 133, 153 |
| BUG-008 | ALTO | Dashboard.tsx | 139 |
| BUG-009 | MEDIO | Dashboard.tsx | 112 |
| BUG-010 | MEDIO | Dashboard.tsx | 37 |
| BUG-011 | MEDIO | Dashboard.tsx / App.tsx / Login.tsx | múltiples |
| BUG-012 | BAJO | supabase_final_schema_v2.sql | ausente |
| BUG-013 | BAJO | Dashboard.tsx | 76-78 |

---

## SECCIÓN 1: Auditoría de Políticas RLS

### BUG-001 — CRÍTICO: Admin bypass abierto a cualquier usuario autenticado

```sql
-- POLÍTICA VULNERABLE ACTUAL (supabase_final_schema_v2.sql:54):
CREATE POLICY "Admin: Control Total Profiles" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);
```

**Impacto:** Cualquier usuario autenticado puede modificar profiles ajenos.  
Supabase aplica OR lógico entre políticas — `USING (true)` anula todas las restricciones.

**Ataque posible desde la consola del browser:**
```javascript
supabase.from('profiles')
  .update({ limit_msgs: 9999, status: 'Activo', plan: 'Plan Pro Judicial' })
  .eq('id', 'uuid-de-otro-usuario')
// Resultado: escalada de privilegios sin pago real.
```

**SQL Corregido:**
```sql
-- Función helper para verificar admin por email real
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email = 'Admin2577@gma.co'
  );
$$;

DROP POLICY IF EXISTS "Admin: Control Total Profiles" ON public.profiles;
CREATE POLICY "Admin: Control Total Profiles" ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin: Ver todas las Notifs" ON public.notifications;
CREATE POLICY "Admin: Ver todas las Notifs" ON public.notifications
  FOR SELECT USING (public.is_admin());
```

---

### BUG-002 — CRÍTICO: Funciones SECURITY DEFINER sin guardia de email + GRANT a anon

`get_all_users_admin()` tiene `GRANT EXECUTE TO anon` — cualquier visitante anónimo puede listar todos los usuarios y emails de la plataforma.

`admin_update_user_plan()` puede ser llamada por cualquier usuario autenticado con cualquier `p_user_id`.

**SQL Corregido:** Ver `supabase_rls_security_fix.sql` (generado en esta sesión).

---

## SECCIÓN 2: Casos de Prueba

### TC-01: Pago exitoso — Compra extra
```
PRECONDICIÓN: usuario con limit_msgs=5, sent_msgs=5
DADO: selecciona "5 mensajes extra", ingresa tarjeta válida
CUANDO: Edge Function process-payment retorna { success: true }
ENTONCES:
  - profiles.limit_msgs = 10
  - profiles.payment_id = <mp_payment_id_real>
  - account.limit en React = 10
  - UI muestra estado 'success' con animación verde
```

### TC-02: Pago fallido — Token MP inválido
```
DADO: tarjeta rechazada (ej. sin fondos)
CUANDO: MP retorna status != 'approved'
ENTONCES:
  - profiles NO se modifica
  - UI muestra estado 'error' con mensaje descriptivo
  - Modal permanece abierto con botón "INTENTAR DE NUEVO"
```

### TC-03: Webhook duplicado — Idempotencia
```
DADO: payment_id "PAY-9876543" ya fue procesado
CUANDO: llega segundo evento idéntico (retry de MP)
ENTONCES:
  - limit_msgs NO se incrementa segunda vez
  - HTTP response: 200 OK
  - Log del evento duplicado
NOTA: Requiere verificar payment_id antes de actualizar profiles.
```

### TC-04: Concurrencia — Race condition en increment_message_count
```
DADO: usuario con sent_msgs=4, limit_msgs=5 (queda 1)
CUANDO: doble-click o 2 pestañas simultáneas llaman al RPC
ENTONCES:
  - sent_msgs = 5 (nunca 6)
  - Segunda RPC retorna error de límite alcanzado
  - pg_stat_activity muestra 0 filas 'idle in transaction'
```

### TC-05: CASCADE en eliminación de cuenta
```
DADO: usuario con 1 fila en profiles y 3 en notifications
CUANDO: usuario es eliminado de auth.users
ENTONCES:
  - profiles: fila eliminada ✓ (CASCADE correcto en schema)
  - notifications: 3 filas eliminadas ✓ (CASCADE correcto en schema)
```

---

## SECCIÓN 3: Validación de Expansión de Schema

Las tablas nuevas deben cumplir:

| Requisito | casos_legales | documentos_encriptados | bitacora_mensajes |
|---|---|---|---|
| RLS habilitado | ✓ (en supabase_schema_expansion.sql) | ✓ | ✓ |
| SELECT restringido a owner | ✓ | ✓ | ✓ |
| INSERT con CHECK owner_id | ✓ | ✓ | ✓ |
| UPDATE con guardia | ✓ | ✓ | N/A (inmutable) |
| DELETE con guardia | ✓ | ✓ | N/A |
| Admin bypass con is_admin() | ⚠ Usar USING(true) → migrar a is_admin() | ⚠ | ⚠ |
| Índice en owner_id | ✓ | ✓ | ✓ |
| Índice en created_at | Pendiente | Pendiente | Pendiente |
| FK a auth.users ON DELETE CASCADE | ✓ | ✓ | ✓ |

---

## SECCIÓN 4: Checklist Pre-Producción

### Base de Datos
- [ ] **CRÍTICO** Política admin con `USING (true)` → migrar a `public.is_admin()`
- [ ] **CRÍTICO** Revocar `GRANT EXECUTE ON get_all_users_admin() TO anon`
- [ ] **CRÍTICO** Agregar guardia de email en funciones SECURITY DEFINER
- [x] RLS habilitado en profiles y notifications
- [x] Función increment_message_count reescrita con UPDATE...RETURNING atómico
- [x] Tablas nuevas con RLS (supabase_schema_expansion.sql)
- [ ] Índices en notifications.owner_id y notifications.created_at

### Pasarela de Pago
- [x] Edge Function process-payment valida con API de MP antes de escribir en DB
- [x] Edge Function mp-webhook valida firma HMAC-SHA256
- [ ] Idempotencia en webhook: verificar payment_id duplicado
- [ ] `identificationNumber` hardcodeado '12345678' → dato real del usuario

### Secretos y Código Fuente
- [ ] **CRÍTICO** `VITE_SUPER_ADMIN_PASSWORD` en .env → visible en bundle del browser, eliminar
- [ ] `ownerPassword: 'GMA_ADMIN_MASTER_2026'` en Dashboard.tsx:139 → mover a Edge Function
- [ ] Eliminar console.log de token MP (Dashboard.tsx:113)
- [ ] Eliminar console.log "SUPER ADMIN DETECTADO" (App.tsx:32)

---

## SECCIÓN 5: Bugs Detallados

### BUG-003 — CRÍTICO: Pago sin cobro real a MercadoPago
**RESUELTO en esta sesión** — processPayment ahora llama Edge Function process-payment.

### BUG-004 — CRÍTICO: Contraseña de admin en bundle del browser
**Archivo:** `.env` — `VITE_SUPER_ADMIN_PASSWORD=GMA_Admin_Master_2026_Secure!`  
Todas las variables `VITE_` son visibles en texto plano en DevTools. **Eliminar esta variable.**  
La detección de admin debe hacerse exclusivamente via Supabase RLS con `public.is_admin()`.

### BUG-005 — ALTO: payment_id no se graba en compras extra
**RESUELTO en esta sesión** — Edge Function graba payment_id en profiles.

### BUG-006 — ALTO: identificationNumber hardcodeado
**Archivo:** `Dashboard.tsx:109` — `identificationNumber: '12345678'`  
Todas las transacciones se procesan con una cédula ficticia.

### BUG-007 — ALTO: Race condition en increment_message_count
**PARCIALMENTE RESUELTO** — La función SQL usa UPDATE atómico. El check del cliente (línea 133) sigue siendo el primero en evaluarse con estado posiblemente stale. La guardia definitiva debe estar en SQL.

### BUG-008 — ALTO: ownerPassword de PDF visible en bundle
**Archivo:** `Dashboard.tsx:139` — `ownerPassword: 'GMA_ADMIN_MASTER_2026'`  
Mover el cifrado PDF a una Edge Function o usar una variable de entorno no-VITE.

### BUG-009 — MEDIO: Manejo de errores MP incompleto en Dashboard
`Dashboard.tsx:112` — solo verifica `!cardToken.id`, no cubre `cardToken.error`.

### BUG-010 — MEDIO: Email ficticio en payload a n8n
`Dashboard.tsx:37` — `email: 'no-email@gma.com'` como valor por defecto hardcodeado.

### BUG-011 — MEDIO: console.log de datos sensibles en producción
`Dashboard.tsx:113`, `App.tsx:32`, `Login.tsx:102` — tokens MP y email de admin en consola.

### BUG-012 — BAJO: Sin índices en tabla notifications
```sql
CREATE INDEX IF NOT EXISTS idx_notifications_owner_id   ON public.notifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
```

### BUG-013 — BAJO: Fecha de vencimiento calculada en cliente
`Dashboard.tsx:76-78` — Persistir `plan_expires_at` en DB al momento del pago.
