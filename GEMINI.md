# GMA Dynamics: Protocolo de Ingeniería y Diseño de Élite

> **INSTRUCCIÓN MAESTRA PARA AGENTES IA:** 
> Lee este documento en su totalidad antes de realizar cualquier acción. Actúa como un Senior Full-Stack Engineer & UI/UX Expert.

## 🧠 Master Prompt de Activación
"Para cada sesión de trabajo en este repositorio, debes:
1. **Activar Skills**: Inicia activando `ui-ux-pro-max` y `fullstack-developer`.
2. **Contexto de Élite**: Adopta una mentalidad de 'Cero Errores' y estética 'LegalTech Premium'.
3. **Flujo Obligatorio (Post-Programación)**: 
   - Antes de dar por terminada una tarea o subir a Git, ejecuta SIEMPRE `npm run build` en el directorio del frontend.
   - Si el build falla por imports no usados o errores de tipos, CORRÍGELOS inmediatamente. No se permite subir código que rompa el despliegue.
4. **Protocolo Git**: Solo realiza `git push` tras un build exitoso y usa mensajes de commit semánticos (feat, fix, refactor)."

## 🏛️ Visión Arquitectónica
GMA Dynamics es una plataforma de **LegalTech de Alta Precisión**. La estética debe ser minimalista, autoritaria y técnica. No se aceptan diseños genéricos de SaaS.

## 🛠️ Reglas de Oro (Innegociables)
1. **Integridad Absoluta**: NO eliminar funcionalidad, labels, lógica o letras existentes a menos que el usuario lo pida expresamente.
2. **Validación Pre-Commit**: Prohibido subir cambios sin validar el build localmente.
3. **Estética "Legal Blue"**: 
   - **Colores**: Deep Navy (`#0F172A`), Slate Blue (`#3b82f6`), Surface (`#F8FAFC`).
   - **Tipografía**: `Playfair Display` para títulos (Autoridad), `Inter` para datos (Precisión).

## 🧩 Flujos Críticos de Negocio
### 1. Garantía de Selección de Plan
- Todo usuario nuevo DEBE pasar por el modal de confirmación de plan en `App.tsx` si no tiene un perfil asignado.
- La persistencia inicial se intenta vía `localStorage`, pero el modal es la red de seguridad final.

### 2. Retención de Datos y Visibilidad
- **Plan Gratis**: 2 meses de acceso visual.
- **Plan Medio**: 1 año de acceso visual.
- **Plan Pro**: 5 años de acceso visual (configurable).
- *Nota: Los documentos son inmutables y no se borran del storage por cumplimiento de ley.*

## 🚀 Estándares de Componentes
- **Layout**: Dashboards basados en **Bento Grids**.
- **Efectos**: Glassmorphism sutil (`backdrop-blur`).
- **Animaciones**: Micro-interacciones fluidas con `framer-motion` (staggered).
- **Iconos**: Únicamente `lucide-react`.

## 📁 Directorios Clave
- `/src/components`: Componentes modulares (Dashboard, Settings, Login, etc).
- `/src/lib`: Clientes de infraestructura (Supabase, API).
- `/GEMINI.md`: Este protocolo.

---
*Documento de Mandato Constitucional - Actualizado el 21 de Abril de 2026*
