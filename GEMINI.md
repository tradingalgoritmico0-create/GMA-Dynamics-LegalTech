# Estado del Proyecto: GMA Dynamics LegalTech

## Objetivo General
Desarrollar una plataforma LegalTech profesional para notificaciones judiciales certificadas bajo la Ley 2213 de 2022, utilizando React, Framer Motion y Supabase con alta seguridad criptográfica.

## 🛠️ Configuraciones y Conocimientos Clave
- **Credenciales Master Admin:** `admin` / `GMA_Admin_2026!` (Bypass en `Login.tsx`).
- **Contraseña Maestra de PDFs:** `GMA_ADMIN_MASTER_2026` (Owner password para archivos cifrados).
- **Seguridad:** Cifrado AES-256 local. El Hash SHA-256 se calcula sobre el archivo cifrado final.
- **Base de Datos:** Tabla `profiles` en Supabase gestiona planes y límites.
- **Tipografía:** Cormorant Garamond (Serif) e Inter (Sans).
- **Colores:** Azul marino profundo (#0F172A), Gris pizarra y acentos en Azul profesional.

## 🚀 Cambios Recientes (Sesión Actual)
1. **Login & Pago:**
   - Se eliminaron PSE y Efecty; se dejó únicamente **Tarjeta de Crédito/Débito** con estética de Mercado Pago.
   - Se corrigieron los márgenes blancos en el Login; ahora el fondo `DottedBackground` es inmersivo (fixed inset 0).
   - Se restauró el checkbox de **Términos y Condiciones** y el modal legal.
2. **Admin Dashboard:**
   - Se eliminaron todos los datos ficticios/Mock. El panel ahora muestra usuarios **reales** de Supabase.
   - Se habilitó la **edición de planes** (Gratis, Medio, Pro) y el ajuste de **límites de mensajes** en tiempo real.
3. **Estabilidad Visual:**
   - Se bloqueó el **desplazamiento horizontal** globalmente en `index.css`.
   - Se corrigieron errores de tipado en `Hero.tsx` y `Features.tsx` para compatibilidad con Framer Motion.
   - Se añadió soporte para la prop `style` en los componentes de fondo (`Backgrounds.tsx`).

## 📋 Estado de Tareas
- [x] Upgrade visual LegalTech Pro.
- [x] Sincronización de Hash criptográfico post-cifrado.
- [x] Implementación de Términos y Condiciones.
- [x] Bypass de Super Admin y gestión de usuarios reales.
- [x] Corrección de bugs visuales (márgenes y scroll horizontal).
- [ ] Configurar webhooks reales para estados de lectura en n8n (Pendiente).

## 💡 Notas para la Próxima Sesión
- Verificar que las políticas de RLS en Supabase permitan al admin (anon/auth) leer y actualizar la tabla `profiles`.
- El flujo de envío judicial en `Dashboard.tsx` ya calcula el Hash correctamente sobre el archivo cifrado.
