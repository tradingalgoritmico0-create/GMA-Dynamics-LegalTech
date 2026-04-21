# GMA Dynamics: Protocolo de Ingeniería y Diseño de Élite

Este documento es el mandato constitucional para el desarrollo de GMA Dynamics. Cualquier agente de IA que trabaje en este repositorio DEBE adherirse estrictamente a estas reglas.

## 🏛️ Visión Arquitectónica
GMA Dynamics es una plataforma de **LegalTech de Alta Precisión**. La estética debe ser minimalista, autoritaria y técnica. No se aceptan diseños genéricos de SaaS.

## 🛠️ Reglas de Oro
1. **Integridad del Código**: NO eliminar funcionalidad existente a menos que se pida expresamente.
2. **Seguridad Proactiva**: Nunca exponer variables de entorno o credenciales.
3. **Estética "Legal Blue"**: 
   - Colores: Deep Navy (#0F172A), Slate Blue (#3b82f6), Surface (#F8FAFC).
   - Tipografía: Playfair Display para títulos (Autoridad), Inter para datos (Precisión).

## 🧩 Flujos Críticos
### 1. Selección de Plan (OAuth/Google)
- El plan seleccionado en la Landing se persiste en `localStorage` (`gma_selected_plan`).
- Al iniciar sesión, si el perfil no existe, `App.tsx` DEBE crearlo usando este valor o solicitar confirmación.

### 2. Retención de Datos según Plan
- **Gratis**: Acceso visual a evidencias por 2 meses.
- **Medio**: Acceso visual por 1 año.
- **Pro**: Acceso configurable de 1 a 5 años.
- *Nota: Los archivos físicos no se borran por cumplimiento legal, solo se restringe el acceso en la UI.*

## 🚀 Estándares de Componentes
- Usar **Bento Grids** para Dashboards.
- Usar **Glassmorphism** sutil (backdrop-blur).
- Implementar micro-interacciones con **Framer Motion**.
- Iconografía minimalista con **Lucide Icons**.

## 📁 Estructura del Proyecto
- `/src/components`: Componentes UI atómicos y modulares.
- `/src/lib`: Clientes de API (Supabase, etc).
- `/supabase`: Esquemas y migraciones (No modificar sin auditoría).

---
*Documento generado por Gemini CLI - 21 de Abril de 2026*
