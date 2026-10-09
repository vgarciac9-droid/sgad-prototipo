# SGAD · Prototipo funcional

Sistema de Gestión y Archivo Digital de la Escuela Oficial Rural Mixta Orfelinda Osorio Lemus.

## Cómo abrirlo en Visual Studio Code

1. Extraiga la carpeta completa.
2. En Visual Studio Code seleccione **Archivo > Abrir carpeta**.
3. Abra la carpeta `sgad-prototipo-funcional`.
4. Instale la extensión **Live Server** si todavía no la tiene.
5. Abra `index.html` y pulse **Go Live**.

También puede ejecutar `iniciar-servidor.bat` si tiene Python instalado y luego visitar `http://localhost:5500`.

No necesita Node.js, `npm install`, base de datos ni conexión a Internet para las funciones principales. Si las fuentes de Google no cargan, el diseño utiliza Arial como alternativa.

## Credenciales de demostración

### Directora

- Correo: `directora@sgad.demo`
- Contraseña: `Demo2026!`

### Docente

- Correo: `carlos@sgad.demo`
- Contraseña: `Docente2026!`

Las cuentas de Ana, Mario y Julia utilizan sus correos `@sgad.demo` y la contraseña `Docente2026!`.

## Persistencia

- Los datos y metadatos se guardan en `localStorage`, clave `sgad_state_v1`.
- Los archivos reales se guardan como Blob en IndexedDB, base `sgad_files_v1`, almacén `files`.
- La sesión activa se guarda en `sessionStorage`.
- Recargar con F5 conserva los cambios y archivos del mismo navegador y dirección local.

## Funciones incluidas

- Inicio de sesión y permisos por rol.
- Paneles diferenciados para Directora y Docente.
- Ciclos históricos y creación de ciclos nuevos.
- Grados, secciones y asignación única de docente responsable.
- Matrícula nueva y reinscripción.
- Expedientes con requisitos, documentos y versiones.
- Repositorio institucional con filtros, edición, reemplazo y categorías.
- Solicitudes a todos los docentes o docentes seleccionados.
- Entrega, comprobante, revisión, aprobación y corrección.
- Notificaciones navegables.
- Reportes filtrados, CSV e impresión/guardado PDF.
- Papelera con restauración y eliminación definitiva.
- Respaldo y restauración de estado y archivos.
- Bitácora persistente.

## Archivos aceptados

PDF, DOCX, XLSX, JPG, JPEG y PNG, con un máximo de 10 MB. PDF e imágenes admiten vista previa; DOCX y XLSX se descargan.

## Restablecer la demostración

Entre como Directora, abra **Copias de seguridad** y utilice **Restablecer ahora**. Esto elimina también los archivos cargados en IndexedDB.

## Alcance

Este es un prototipo frontend local. La versión productiva deberá reemplazar la autenticación y persistencia del navegador por una API segura, PostgreSQL y almacenamiento privado de objetos.
