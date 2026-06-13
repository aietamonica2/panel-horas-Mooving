# Change Management: Cómo Introducir la IA en la Empresa

> **Versión documentada:** v5.20.13 · **Última revisión:** 2026-05-29

> Implementar Senda correctamente desde el punto de vista técnico garantiza que el sistema funcione. Pero que los empleados lo adopten y lo usen es una batalla completamente diferente — y a menudo más difícil.

---

## La Realidad que Nadie Menciona en las Demos

Las demos de IA son perfectas. El agente responde brillantemente, ejecuta acciones en segundos, genera gráficos deslumbrantes. Los directivos quedan impresionados.

Luego llega el lunes de lanzamiento real. Y descubrís que:
- El 60% de los empleados no abre el chat porque "ya tienen sus propias herramientas"
- El 20% lo prueba una vez, tiene una experiencia mediocre (porque todavía no está bien ajustado) y no vuelve
- El 15% lo usa activamente pero no sabe cómo aprovecharlo
- El 5% son los "evangelistas" que lo usan bien y quieren más

Si no gestionás el cambio, el sistema puede estar perfectamente configurado y aun así fracasar en adoption. Y sin adoption, no hay ROI. Y sin ROI, no hay renovación.

---

## Entiende los Perfiles de Resistencia

No todos resisten la IA de la misma manera. Identificar el tipo de resistencia determina qué estrategia usar.

### Perfil 1: El Escéptico Racional
**¿Quién es?** El analista de datos, el técnico, el ingeniero. Su escepticismo no viene del miedo — viene de haber visto tecnologías "revolucionarias" que no cumplieron.  
**Lo que dice:** "Ya usamos ChatGPT y es limitado. ¿En qué es diferente?"  
**La estrategia:** No argumento — demostración técnica. Mostrarle el Chain Debugger, el pipeline de 4 pasos, el ROI Dashboard. Que vea la arquitectura real. Este perfil se convierte en el aliado más poderoso si lo conquistás.

### Perfil 2: El Ansioso por su Trabajo
**¿Quién es?** El operador, el agente de soporte, el administrativo. Siente que la IA puede reemplazarlo.  
**Lo que dice:** "¿Para qué sirvo yo si el sistema hace todo?"  
**La estrategia:** El reencuadre de rol. "La IA se ocupa de las preguntas repetitivas para que vos puedas dedicarte a los casos complejos que requieren juicio humano." Mostrar métricas de otros clientes donde el equipo humano creció en productividad, no se redujo. Involucrarlo en la configuración — que defina los prompts, que cargue los documentos. Que sea co-creador, no víctima.

### Perfil 3: El Desinformado
**¿Quién es?** Cualquier perfil que nunca usó IA y tiene una imagen distorsionada (de películas de ciencia ficción o de artículos sensacionalistas).  
**Lo que dice:** "¿Y si me hackean la conversación?" o "¿La IA no va a inventar cosas?"  
**La estrategia:** Educación sin condescendencia. Explicar el [multi-tenancy](00_glosario.md#multi-tenancy), el cifrado, la Base de Conocimiento que previene [alucinaciones](00_glosario.md#hallucination). Hacer una sesión de preguntas y respuestas honesta donde se puedan expresar las dudas. No minimizar las preocupaciones — responderlas con datos.

### Perfil 4: El Obstaculizador Político
**¿Quién es?** El gerente medio que siente que la IA amenaza su autoridad o reduce su relevancia. Su resistencia rara vez es técnica.  
**Lo que dice:** "Primero habría que evaluar los riesgos de seguridad" (en una reunión de personas que no tienen autoridad para evaluar eso).  
**La estrategia:** Darle un rol de gobernanza. "Sos el responsable de aprobar los prompts del equipo antes de que se publiquen." Convertir la resistencia en accountability. Este perfil es peligroso cuando está sin rol definido; se vuelve aliado cuando tiene poder formal sobre algo.

---

## El Plan de Adopción en 4 Fases

### Fase 1: Los Evangelistas (Semanas 1-2)

Antes del lanzamiento general, identificá 5-10 personas en la organización que cumplan estos criterios:
- Abiertas a la tecnología (no necesariamente técnicas)
- Con credibilidad entre sus pares
- Con disposición a dar feedback constructivo (no a quejarse por quejarse)
- En roles que serán transformados por Senda (soporte, administración, ventas)

Estos son tus Evangelistas. Los invitás a un acceso anticipado con este encuadre: "Somos los primeros en usar esto. Nuestro feedback va a moldear la versión que verán todos los demás."

Lo que hacés durante esta fase:
- Los entrenás en cómo usar el sistema
- Recibís feedback constantemente y ajustás el agente
- Documentás casos de éxito reales ("María ahorró 2 horas de trabajo en el cierre mensual")
- Los convertís en defensores del sistema antes del lanzamiento general

### Fase 2: El Lanzamiento con Historia (Semana 3)

El lanzamiento general no es "ya está disponible, usarlo". Es un evento comunicacional.

**El kit de lanzamiento:**
1. **Email de lanzamiento del CEO/Gerente General** — No de IT, no del implementador. Del máximo líder disponible. El mensaje es: "Esto es estratégico para la empresa."
2. **Video de 3 minutos** con un caso de uso real del Evangelista mostrando cómo lo usa
3. **Guía de primeros pasos** — Cómo entrar, qué hacer las primeras 3 veces (no un manual de 50 páginas)
4. **Canal de feedback** — Un email, un canal de Slack, algo donde los usuarios puedan reportar problemas sin sentirse expuestos

### Las Herramientas que Aceleran la Adopción (v5.11+)

Las funciones nuevas de Senda están diseñadas para reducir la barrera de entrada. Usá estas herramientas estratégicamente según la fase:

| Fase | Herramienta | Por qué acelera la adopción |
|---|---|---|
| Evangelistas | **Senda Studio** | Los early adopters crean sus propios agentes describiendo lo que necesitan. No requieren conocimiento técnico. |
| Lanzamiento | **Chatless UI** | Los directivos ven valor inmediato: abren Senda y reciben KPIs sin escribir nada. |
| Acompañamiento | **Pipeline Canvas** | Los power users diseñan flujos visuales arrastrando nodos. Reduce la percepción de complejidad. |
| Institucionalización | **Marketplace** | Instalar Skill Packs pre-armados estandariza la configuración entre equipos. |

> 💡 **Truco de adopción:** Mostrá Chatless UI a los directivos en la primera reunión. Cuando ven que Senda les entrega información sin que la pidan, la resistencia cae dramáticamente.

### Fase 3: El Acompañamiento Activo (Semanas 3-6)

Los primeros 30 días son críticos. Durante este período:
- Revisá las conversaciones con puntaje bajo de efectividad DIARIAMENTE
- Respondé rápido a los problemas reportados (los usuarios perdonan los errores si se resuelven rápido; no perdonan la indiferencia)
- Celebrá públicamente los logros ("El equipo de soporte resolvió 200 tickets esta semana sin intervención humana")
- Identificá los "power users" que aparezcan naturalmente — los que usan el sistema de formas que no anticipaste

### Fase 4: La Institucionalización (Mes 2 en adelante)

El objetivo de esta fase es que Senda se convierta en infraestructura, no en proyecto. Infraestructura es algo que la empresa no puede imaginar no tener.

Los indicadores de institucionalización:
- Los empleados reportan sus propios casos de uso ("¿No se podría hacer que el agente también...?")
- Hay personas en el equipo del cliente que saben ajustar prompts por su cuenta
- Los nuevos empleados aprenden a usar Senda como parte del onboarding estándar
- El cliente está pensando en expandir a nuevos espacios o casos de uso

---

## La Presentación de la IA al Equipo: El Script

Esta es la conversación que más asusta a los implementadores: la reunión donde le presentan Senda al equipo que lo va a usar. Aquí está el script probado:

**Apertura (no empieces con tecnología):**
"El objetivo de esta herramienta no es reemplazar el trabajo que hacen — es darles más tiempo para hacer el trabajo que realmente importa. Las preguntas repetitivas, las consultas de 'cómo hago X', la creación de tickets estándar — todo eso lo va a manejar el sistema. Ustedes van a poder enfocarse en los casos que requieren experiencia y criterio humano."

**La demostración (usa un caso real del equipo):**
No uses el caso de uso del demo genérico. Preguntá al equipo antes de la reunión cuál es la tarea que más tiempo les consume. Configurá el agente para resolver exactamente eso. Mostrarlo en vivo.

**El espacio de preguntas (abrilo sin defensas):**
"Tengan total libertad de plantear dudas o preocupaciones. No hay preguntas tontas. Esta tecnología es nueva y es normal tener preguntas."

**El cierre con ownership:**
"Los invitamos a ser parte de la configuración. Ustedes mejor que nadie saben qué preguntas reciben, qué documentos son útiles y qué procesos son más tediosos. Con ese conocimiento, el sistema va a funcionar mucho mejor."

---

## Métricas de Adopción: Cómo Saber Si Va Bien

No todas las métricas de éxito son técnicas. Estas son las métricas de adopción que importan:

| Métrica | ¿Cómo medirla? | Meta al mes 1 | Meta al mes 3 |
|---|---|---|---|
| **Usuarios activos únicos** | Analytics de Senda | >30% del total habilitado | >60% |
| **Conversaciones por usuario activo** | Analytics de Senda | >2 por semana | >5 por semana |
| **Net Promoter Score interno** | Encuesta breve mensual | >6/10 | >7.5/10 |
| **Casos de uso espontáneos** | Reportados por el cliente | 2-3 | 8-10 |
| **Solicitudes de expansión** | Conversaciones con el cliente | 1 | 3+ |
| % de usuarios usando Studio para crear | >20% en mes 2 | Adopción de creación asistida |
| Sesiones Chatless vs. Chat tradicional | 30/70 en mes 3 | Transición a interfaz proactiva |
| Pipelines creados en Canvas | >5 en mes 2 | Adopción de flujos visuales |
| Skill Packs instalados | >3 en mes 1 | Estandarización de configuración |

---

## Lo Que No Debés Hacer

- **No prometas que el sistema "nunca se equivoca"** — Va a equivocarse. La confianza se construye demostrando que cuando se equivoca, se detecta y se corrige.
- **No ignores la resistencia** — Cada persona resistente que ignorás se convierte en un detractor. Cada persona resistente que convertís se convierte en un promotor.
- **No lances sin training mínimo** — 30 minutos de sesión práctica con el equipo son suficientes. No hacerlo garantiza que el 70% del equipo nunca supere la primera sesión de uso.
- **No dejes el primer feedback sin respuesta** — Si un usuario reporta un problema y nadie responde en 48hs, ese usuario abandona y habla mal del sistema.

---

## Checklist del Capítulo

- [ ] ¿Identifiqué los perfiles de resistencia en el equipo del cliente?
- [ ] ¿Seleccioné 5-10 evangelistas para la fase piloto?
- [ ] ¿Preparé el kit de lanzamiento (email CEO, video, guía, canal de feedback)?
- [ ] ¿Tengo un plan de acompañamiento activo para las primeras 4 semanas?
- [ ] ¿Definí las métricas de adopción y las metas para mes 1 y mes 3?
- [ ] ¿Preparé el script de presentación al equipo?
- [ ] ¿Incluí Senda Studio y Chatless UI en el plan de demostración inicial?
- [ ] ¿Definí métricas de adopción para las herramientas nuevas (Studio, Chatless, Canvas)?

---

> 📖 **Anterior:** [09 — Playbook de Implementación](./06_playbook_implementacion.md)
> 📖 **Siguiente:** [11 — ROI y Business Case](./08_roi_y_business_case.md)
