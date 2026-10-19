(function () {
  "use strict";
  var App = window.SGADApp;

  function pageHead(eyebrow, title, subtitle, actions) {
    return '<div class="page-head"><div><p class="eyebrow">' + App.escape(eyebrow) + '</p><h1>' + App.escape(title) + '</h1><p>' + App.escape(subtitle) + '</p></div><div class="page-actions">' + (actions || "") + "</div></div>";
  }

  function metric(label, value, subtitle, foot, target, icon) {
    return '<article class="metric"><div class="metric-head"><div><div class="metric-label">' + App.escape(label) + '</div><div class="metric-value">' + App.escape(value) + '</div></div><span class="metric-icon">' + icon + '</span></div><div class="metric-sub">' + App.escape(subtitle) + '</div><div class="metric-foot"><span>' + App.escape(foot) + '</span>' + (target ? '<button class="link-button" data-action="navigate" data-view="' + target + '">Ver detalles →</button>' : "") + "</div></article>";
  }

  App.pages.dashboard = function () {
    var cycle = App.selectedCycle();
    var enrollments = App.selectedEnrollments();
    var sections = App.state.sections.filter(function (x) { return x.cycleId === cycle.id && x.active; });
    var assignedIds = new Set(sections.map(function (x) { return x.teacherId; }).filter(Boolean));
    var teachers = App.state.users.filter(function (x) { return x.role === "docente" && x.active && assignedIds.has(x.id); });
    var incomplete = enrollments.filter(function (x) { return !App.studentFileStatus(x.studentId, cycle.id).complete; }).length;
    var reviewPending = App.state.submissions.filter(function (submission) {
      var request = App.state.deliveryRequests.find(function (item) { return item.id === submission.requestId; });
      return request && request.cycleId === cycle.id && ["Recibido", "Entregado nuevamente", "En revisión"].indexOf(submission.status) >= 0;
    }).length;
    var openRequests = App.state.deliveryRequests.filter(function (x) { return x.cycleId === cycle.id && x.status === "Vigente"; });
    var currentAudit = App.state.audit.slice(0, 5);
    var requestList = openRequests.slice(0, 4).map(function (request) {
      var delivered = request.targetUserIds.filter(function (teacherId) {
        return App.state.submissions.some(function (submission) { return submission.requestId === request.id && submission.teacherId === teacherId; });
      }).length;
      var percent = request.targetUserIds.length ? Math.round(delivered * 100 / request.targetUserIds.length) : 0;
      return '<li class="list-item"><span class="list-icon">◷</span><div class="list-main"><strong>' + App.escape(request.title) + '</strong><small>Vence: ' + App.formatDate(request.dueDate) + ' · ' + delivered + '/' + request.targetUserIds.length + ' entregaron</small><div class="progress"><span style="width:' + percent + '%"></span></div></div><button class="link-button" data-action="request-compliance" data-id="' + request.id + '">Ver</button></li>';
    }).join("");
    var activity = currentAudit.map(function (item) {
      return '<li class="list-item"><span class="list-icon">' + (item.action.indexOf("documento") >= 0 ? "▤" : "✓") + '</span><div class="list-main"><strong>' + App.escape(item.action) + '</strong><small>' + App.escape(item.details) + ' · ' + App.formatDate(item.date, true) + '</small></div></li>';
    }).join("");
    return '<div class="page director-dashboard"><section class="hero"><div><p class="eyebrow">Panel directivo · ciclo ' + cycle.year + '</p><h1>Bienvenida, Prof. María Eugenia</h1><p>Revise matrículas, expedientes, documentos y entregas del ciclo seleccionado.</p></div><button class="btn" data-action="open-upload-document">Subir documento</button></section>' +
      '<section class="metrics">' +
      metric("Estudiantes matriculados", enrollments.length, "Estudiantes activos en este ciclo", incomplete + " expedientes incompletos", "enrollments", "◎") +
      metric("Docentes asignados", teachers.length, "Responsables únicos con sección", sections.length + " secciones activas", "cycles", "♟") +
      metric("Pendientes de revisión", reviewPending, "Documentos enviados por docentes", reviewPending ? "Requieren atención" : "Bandeja al día", "reviews", "✓") +
      metric("Solicitudes abiertas", openRequests.length, "Entregas programadas", openRequests.length + " vigentes", "requests", "◷") +
      '</section><section class="grid-2"><article class="card"><div class="card-head"><div><h2 class="card-title">Solicitudes de entrega</h2><p class="card-subtitle">Cumplimiento docente calculado en tiempo real</p></div><button class="btn btn-primary btn-sm" data-action="open-request-form">Crear solicitud</button></div><ul class="list">' + (requestList || '<li>' + App.empty("Sin solicitudes vigentes", "No existen convocatorias abiertas en este ciclo.") + '</li>') + '</ul></article>' +
      '<article class="card"><div class="card-head"><div><h2 class="card-title">Actividad reciente</h2><p class="card-subtitle">Movimientos registrados en el sistema</p></div><button class="link-button" data-action="navigate" data-view="audit">Ver bitácora</button></div><ul class="list">' + (activity || '<li>' + App.empty("Sin movimientos", "Todavía no existe actividad registrada.") + '</li>') + '</ul></article></section></div>';
  };

  App.pages.reviews = function () {
    var cycleId = App.state.settings.selectedCycleId;
    var rows = App.state.submissions.filter(function (submission) {
      var request = App.state.deliveryRequests.find(function (x) { return x.id === submission.requestId; });
      return request && request.cycleId === cycleId;
    }).sort(function (a,b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
    var body = rows.map(function (submission) {
      var request = App.state.deliveryRequests.find(function (x) { return x.id === submission.requestId; });
      return '<tr><td><div class="cell-title">' + App.escape(request ? request.title : "Solicitud no disponible") + '</div><div class="cell-sub">' + App.escape(submission.code) + '</div></td><td>' + App.escape(App.userName(submission.teacherId)) + '</td><td>' + App.formatDate(submission.submittedAt, true) + '</td><td>' + App.statusBadge(submission.status) + '</td><td><div class="table-actions"><button class="btn btn-soft btn-sm" data-action="view-submission" data-id="' + submission.id + '">Revisar</button></div></td></tr>';
    }).join("");
    return '<div class="page">' + pageHead("Seguimiento documental", "Bandeja de revisión", "Abra el archivo antes de emitir un dictamen.") + '<div class="toolbar"><input class="input" id="review-search" placeholder="Buscar solicitud, docente o código..."><select class="input" id="review-status"><option value="">Todos los estados</option><option>Recibido</option><option>En revisión</option><option>Aprobado</option><option>Corrección solicitada</option><option>Entregado nuevamente</option></select><select class="input" id="review-teacher"><option value="">Todos los docentes</option>' + App.formOptions(App.state.users.filter(function (x) { return x.role === "docente" && x.active; }), "id", "name") + '</select></div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Solicitud</th><th>Docente</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead><tbody id="review-rows">' + (body || '<tr><td colspan="5">' + App.empty("Bandeja vacía", "No existen entregas en este ciclo.") + '</td></tr>') + '</tbody></table></div></div></div>';
  };

  App.pageMounted.reviews = function () {
    ["review-search", "review-status", "review-teacher"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", filterReviews);
    });
  };

  function filterReviews() {
    var search = App.normalizeSearch(document.getElementById("review-search").value);
    var status = document.getElementById("review-status").value;
    var teacher = document.getElementById("review-teacher").value;
    var cycleId = App.state.settings.selectedCycleId;
    var rows = App.state.submissions.filter(function (submission) {
      var request = App.state.deliveryRequests.find(function (x) { return x.id === submission.requestId; });
      var haystack = App.normalizeSearch((request ? request.title : "") + " " + App.userName(submission.teacherId) + " " + submission.code);
      return request && request.cycleId === cycleId && (!search || haystack.indexOf(search) >= 0) && (!status || submission.status === status) && (!teacher || submission.teacherId === teacher);
    });
    document.getElementById("review-rows").innerHTML = rows.length ? rows.map(function (submission) {
      var request = App.state.deliveryRequests.find(function (x) { return x.id === submission.requestId; });
      return '<tr><td><div class="cell-title">' + App.escape(request.title) + '</div><div class="cell-sub">' + App.escape(submission.code) + '</div></td><td>' + App.escape(App.userName(submission.teacherId)) + '</td><td>' + App.formatDate(submission.submittedAt, true) + '</td><td>' + App.statusBadge(submission.status) + '</td><td><button class="btn btn-soft btn-sm" data-action="view-submission" data-id="' + submission.id + '">Revisar</button></td></tr>';
    }).join("") : '<tr><td colspan="5">' + App.empty("Sin coincidencias", "Cambie los filtros para consultar otros registros.") + '</td></tr>';
  }

  App.actions["view-submission"] = function (element) {
    var submission = App.state.submissions.find(function (x) { return x.id === element.dataset.id; });
    if (!submission) return;
    var request = App.state.deliveryRequests.find(function (x) { return x.id === submission.requestId; });
    var canReview = ["Recibido", "Entregado nuevamente", "En revisión"].indexOf(submission.status) >= 0;
    App.openModal({
      size: "lg", eyebrow: "Bandeja de revisión", title: submission.code,
      body: '<div class="detail-grid"><div class="detail-item"><label>Solicitud</label><strong>' + App.escape(request ? request.title : "—") + '</strong></div><div class="detail-item"><label>Docente</label><strong>' + App.escape(App.userName(submission.teacherId)) + '</strong></div><div class="detail-item"><label>Fecha de entrega</label><strong>' + App.formatDate(submission.submittedAt, true) + '</strong></div><div class="detail-item"><label>Estado</label><strong>' + App.escape(submission.status) + '</strong></div><div class="detail-item"><label>Archivo</label><strong>' + App.escape(submission.fileName || "—") + '</strong></div><div class="detail-item"><label>Versión</label><strong>v' + submission.version + '</strong></div></div>' + (submission.correctionReason ? '<div class="alert alert-warning mt-20"><span>i</span><div><strong>Corrección solicitada:</strong> ' + App.escape(submission.correctionReason) + '</div></div>' : ""),
      footer: '<button class="btn btn-secondary" data-action="close-modal">Cerrar</button><button class="btn btn-soft" data-action="preview-file" data-collection="submissions" data-module="Entregas" data-id="' + submission.id + '">Ver archivo</button><button class="btn btn-secondary" data-action="download-file" data-collection="submissions" data-module="Entregas" data-id="' + submission.id + '">Descargar</button>' + (canReview ? '<button class="btn btn-warning" data-action="request-correction" data-id="' + submission.id + '">Solicitar corrección</button><button class="btn btn-primary" data-action="approve-submission" data-id="' + submission.id + '">Aprobar</button>' : "")
    });
  };

  App.actions["approve-submission"] = function (element) {
    var submission = App.state.submissions.find(function (x) { return x.id === element.dataset.id; });
    if (!submission) return;
    App.confirm("Aprobar entrega", "La entrega quedará registrada como aprobada. Esta acción notificará al docente.", function () {
      submission.status = "Aprobado";
      submission.reviewedAt = App.nowIso();
      submission.reviewedBy = App.currentUser().id;
      App.notify(submission.teacherId, "Documento aprobado", "La entrega " + submission.code + " fue aprobada.", "teacher-documents", submission.id, "approval");
      App.audit("Aprobó documento", "Bandeja de revisión", submission.code, submission.fileName || "Entrega aprobada");
      App.toast("Entrega aprobada correctamente.", "success");
      App.renderShell();
    });
  };

  App.actions["request-correction"] = function (element) {
    var id = element.dataset.id;
    App.openModal({
      size: "sm", eyebrow: "Revisión documental", title: "Solicitar corrección",
      body: '<form id="correction-form"><div class="form-group"><label class="required" for="correction-reason">Motivo e instrucciones</label><textarea class="input" id="correction-reason" name="reason" required minlength="8" placeholder="Explique claramente qué debe corregir el docente..."></textarea></div></form>',
      footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-warning" data-action="save-correction" data-id="' + id + '">Enviar corrección</button>'
    });
  };

  App.actions["save-correction"] = function (element) {
    var form = document.getElementById("correction-form");
    if (!form.reportValidity()) return;
    var submission = App.state.submissions.find(function (x) { return x.id === element.dataset.id; });
    var reason = document.getElementById("correction-reason").value.trim();
    submission.status = "Corrección solicitada";
    submission.correctionReason = reason;
    submission.reviewedAt = App.nowIso();
    submission.reviewedBy = App.currentUser().id;
    App.notify(submission.teacherId, "Corrección solicitada", reason, "teacher-corrections", submission.id, "correction");
    App.audit("Solicitó corrección", "Bandeja de revisión", submission.code, reason);
    App.closeModal();
    App.toast("La corrección fue enviada al docente.", "success");
    App.renderShell();
  };

  App.pages.repository = function () {
    var cycleId = App.state.settings.selectedCycleId;
    var docs = App.state.repositoryDocuments.filter(function (item) { return item.cycleId === cycleId; });
    var rows = repositoryRows(docs);
    var actions = '<button class="btn btn-secondary" data-action="manage-categories">Categorías</button><button class="btn btn-primary" data-action="open-upload-document">Subir documento</button>';
    return '<div class="page">' + pageHead("Archivo digital", "Repositorio institucional", "Consulte, filtre y administre los documentos del ciclo seleccionado.", actions) +
      '<div class="toolbar four"><input class="input" id="repo-search" placeholder="Buscar código, título o responsable..."><select class="input" id="repo-category"><option value="">Todas las categorías</option>' + App.formOptions(App.state.documentCategories.filter(function (x) { return x.active; }), "id", "name") + '</select><select class="input" id="repo-status"><option value="">Todos los estados</option><option>Vigente</option><option>Archivado</option></select><select class="input" id="repo-access"><option value="">Todos los accesos</option><option>Solo Dirección</option><option>Dirección y docentes</option></select></div>' +
      '<div class="table-card"><div class="table-wrap"><table><thead><tr><th>Documento</th><th>Categoría</th><th>Responsable</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="repository-rows">' + (rows || '<tr><td colspan="6">' + App.empty("Repositorio vacío", "No existen documentos en el ciclo seleccionado.") + '</td></tr>') + '</tbody></table></div></div></div>';
  };

  function repositoryRows(docs) {
    return docs.map(function (doc) {
      return '<tr><td><div class="cell-title">' + App.escape(doc.title) + '</div><div class="cell-sub">' + App.escape(doc.code) + ' · v' + doc.version + '</div></td><td>' + App.escape(App.categoryName(doc.categoryId)) + '</td><td>' + App.escape(App.userName(doc.responsibleId)) + '</td><td>' + App.formatDate(doc.documentDate) + '</td><td>' + App.statusBadge(doc.status) + '</td><td><div class="table-actions"><button class="btn btn-soft btn-sm" data-action="view-document-sheet" data-id="' + doc.id + '">Ver ficha</button><button class="btn btn-secondary btn-sm" data-action="document-menu" data-id="' + doc.id + '">Administrar</button></div></td></tr>';
    }).join("");
  }

  App.pageMounted.repository = function () {
    ["repo-search", "repo-category", "repo-status", "repo-access"].forEach(function (id) { document.getElementById(id).addEventListener("input", filterRepository); });
  };

  function filterRepository() {
    var search = App.normalizeSearch(document.getElementById("repo-search").value);
    var category = document.getElementById("repo-category").value;
    var status = document.getElementById("repo-status").value;
    var access = document.getElementById("repo-access").value;
    var docs = App.state.repositoryDocuments.filter(function (doc) {
      var haystack = App.normalizeSearch(doc.code + " " + doc.title + " " + App.userName(doc.responsibleId));
      return doc.cycleId === App.state.settings.selectedCycleId && (!search || haystack.indexOf(search) >= 0) && (!category || doc.categoryId === category) && (!status || doc.status === status) && (!access || doc.access === access);
    });
    document.getElementById("repository-rows").innerHTML = docs.length ? repositoryRows(docs) : '<tr><td colspan="6">' + App.empty("Sin coincidencias", "Cambie los filtros para consultar otros documentos.") + '</td></tr>';
  }

  App.actions["view-document-sheet"] = function (element) {
    var doc = App.state.repositoryDocuments.find(function (x) { return x.id === element.dataset.id; });
    if (!doc) return;
    App.openModal({
      size: "lg", eyebrow: "Repositorio institucional", title: "Ficha · " + doc.code,
      body: '<div class="detail-grid"><div class="detail-item"><label>Código</label><strong>' + App.escape(doc.code) + '</strong></div><div class="detail-item"><label>Título</label><strong>' + App.escape(doc.title) + '</strong></div><div class="detail-item"><label>Categoría</label><strong>' + App.escape(App.categoryName(doc.categoryId)) + '</strong></div><div class="detail-item"><label>Responsable</label><strong>' + App.escape(App.userName(doc.responsibleId)) + '</strong></div><div class="detail-item"><label>Fecha</label><strong>' + App.formatDate(doc.documentDate) + '</strong></div><div class="detail-item"><label>Estado</label><strong>' + App.escape(doc.status) + '</strong></div><div class="detail-item"><label>Nivel de acceso</label><strong>' + App.escape(doc.access) + '</strong></div><div class="detail-item"><label>Nombre del archivo</label><strong>' + App.escape(doc.fileName || "—") + '</strong></div><div class="detail-item"><label>Formato</label><strong>' + App.escape(doc.mimeType || "No disponible") + '</strong></div><div class="detail-item"><label>Tamaño</label><strong>' + window.SGADStorage.formatBytes(doc.fileSize) + '</strong></div><div class="detail-item"><label>Versión</label><strong>v' + doc.version + '</strong></div><div class="detail-item"><label>Descripción</label><strong>' + App.escape(doc.description || "—") + '</strong></div></div>' + (!doc.fileId ? '<div class="alert alert-warning mt-20"><span>⚠</span><div>Registro de demostración sin archivo binario. Utilice “Reemplazar archivo” para agregar uno real.</div></div>' : "") + versionHistory(doc),
      footer: '<button class="btn btn-secondary" data-action="close-modal">Cerrar</button><button class="btn btn-soft" data-action="preview-file" data-collection="repositoryDocuments" data-module="Repositorio" data-id="' + doc.id + '">Ver archivo</button><button class="btn btn-primary" data-action="download-file" data-collection="repositoryDocuments" data-module="Repositorio" data-id="' + doc.id + '">Descargar</button>'
    });
  };

  function versionHistory(doc) {
    if (!doc.versions || !doc.versions.length) return "";
    return '<div class="mt-20"><h3 class="card-title">Historial de versiones</h3><ul class="list">' + doc.versions.slice().reverse().map(function (version) {
      return '<li class="list-item"><span class="list-icon">v' + version.version + '</span><div class="list-main"><strong>' + App.escape(version.fileName || "Archivo anterior") + '</strong><small>' + App.formatDate(version.replacedAt, true) + ' · ' + App.escape(version.reason || "Reemplazo de archivo") + '</small></div>' + (version.fileId ? '<button class="btn btn-secondary btn-sm" data-action="download-version" data-file-id="' + App.escape(version.fileId) + '" data-file-name="' + App.escape(version.fileName) + '">Descargar</button>' : '<span class="muted">No disponible</span>') + '</li>';
    }).join("") + "</ul></div>";
  }

  App.actions["download-version"] = function (element) {
    var fileId = element.dataset.fileId; var fileName = element.dataset.fileName;
    return window.SGADStorage.getFile(fileId).then(function (record) { if (!record || !record.blob) throw new Error("La versión seleccionada no está disponible."); window.SGADStorage.downloadBlob(record.blob, record.name || fileName); App.audit("Descargó versión histórica", "Repositorio", fileId, record.name || fileName); }).catch(function (error) { App.toast(error.message, "error"); });
  };

  App.actions["document-menu"] = function (element) {
    var doc = App.state.repositoryDocuments.find(function (x) { return x.id === element.dataset.id; });
    if (!doc) return;
    App.openModal({
      size: "sm", eyebrow: "Administrar documento", title: doc.code,
      body: '<p class="muted mt-0">Seleccione la acción que desea realizar sobre <strong>' + App.escape(doc.title) + '</strong>.</p><div class="grid-2"><button class="btn btn-soft" data-action="edit-document" data-id="' + doc.id + '">Editar metadatos</button><button class="btn btn-soft" data-action="replace-document" data-id="' + doc.id + '">Reemplazar archivo</button><button class="btn btn-secondary" data-action="view-document-sheet" data-id="' + doc.id + '">Ver ficha</button><button class="btn btn-danger" data-action="trash-document" data-id="' + doc.id + '">Enviar a papelera</button></div>',
      footer: '<button class="btn btn-secondary" data-action="close-modal">Cerrar</button>'
    });
  };

  App.actions["open-upload-document"] = function () {
    if (!App.isSelectedCycleWritable()) { App.toast("No se pueden subir documentos en un ciclo cerrado.", "warning"); return; }
    App.openModal({
      size: "lg", eyebrow: "Archivo digital", title: "Subir documento",
      body: '<form id="upload-document-form"><div class="form-group"><label class="required" for="upload-type">Tipo de documento</label><select class="input" id="upload-type" name="type"><option value="institutional">Documento institucional</option><option value="student">Documento de expediente estudiantil</option></select></div><div id="upload-dynamic-fields"></div></form>',
      footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-upload-document">Guardar documento</button>'
    });
    renderUploadFields("institutional");
    document.getElementById("upload-type").addEventListener("change", function (event) { renderUploadFields(event.target.value); });
  };

  
  function renderUploadFields(type) {
    var target = document.getElementById("upload-dynamic-fields");
    if (!target) return;

    if (type === "institutional") {
      target.innerHTML = '<div class="form-group"><label class="required" for="doc-title">Título del documento</label><input class="input" id="doc-title" name="title" required maxlength="120" placeholder="Ej. Acta de reunión de padres de familia"></div><div class="field-row"><div class="form-group"><label class="required" for="doc-category">Categoría</label><select class="input" id="doc-category" name="categoryId" required>' + App.formOptions(App.state.documentCategories.filter(function (x) { return x.active; }), "id", "name") + '</select></div><div class="form-group"><label class="required" for="doc-access">Nivel de acceso</label><select class="input" id="doc-access" name="access" required><option>Solo Dirección</option><option>Dirección y docentes</option></select></div></div><div class="field-row"><div class="form-group"><label class="required" for="doc-date">Fecha documental</label><input class="input" id="doc-date" name="documentDate" type="date" value="' + App.todayIso() + '" required></div><div class="form-group"><label class="required" for="doc-file">Archivo digital</label><input class="input" id="doc-file" name="file" type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" required></div></div><div class="form-group"><label for="doc-description">Descripción u observaciones</label><textarea class="input" id="doc-description" name="description" placeholder="Describa brevemente el contenido..."></textarea><p class="input-hint">PDF, DOCX, XLSX, JPG, JPEG o PNG · máximo 10 MB.</p></div>';
      return;
    }

    var cycleId = App.state.settings.selectedCycleId;
    var sections = App.state.sections.filter(function (section) {
      return section.cycleId === cycleId && section.active;
    }).sort(function (a, b) {
      return a.grade - b.grade || a.label.localeCompare(b.label);
    });

    target.innerHTML =
      '<div class="form-group">' +
        '<label class="required" for="upload-section">1. Grado y sección</label>' +
        '<select class="input" id="upload-section" required>' +
          '<option value="">Seleccione grado y sección...</option>' +
          App.formOptions(sections, "id", "label") +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="required" for="upload-student-search">2. Buscar estudiante</label>' +
        '<input class="input" id="upload-student-search" type="search" ' +
          'placeholder="Escriba nombre, apellido o código..." autocomplete="off" disabled>' +
        '<input type="hidden" id="upload-student" name="studentId">' +
        '<div id="upload-student-results" class="upload-student-results" aria-live="polite">' +
          '<p class="muted">Seleccione primero un grado y sección.</p>' +
        '</div>' +
        '<div id="upload-student-selected"></div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="required" for="upload-requirement">3. Documento del expediente</label>' +
        '<select class="input" id="upload-requirement" name="requirementId" required disabled>' +
          '<option value="">Seleccione primero un estudiante</option>' +
        '</select>' +
      '</div>' +
      '<div id="student-file-warning"></div>' +
      '<div class="field-row">' +
        '<div class="form-group"><label class="required" for="student-doc-file">4. Archivo digital</label>' +
          '<input class="input" id="student-doc-file" name="file" type="file" ' +
          'accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" required></div>' +
        '<div class="form-group"><label for="student-doc-notes">Observaciones</label>' +
          '<textarea class="input" id="student-doc-notes" name="description"></textarea></div>' +
      '</div>' +
      '<p class="input-hint">Los documentos ya entregados se actualizan como una nueva versión.</p>';

    var sectionSelect = document.getElementById("upload-section");
    var searchInput = document.getElementById("upload-student-search");
    var selectedInput = document.getElementById("upload-student");
    var results = document.getElementById("upload-student-results");
    var selectedLabel = document.getElementById("upload-student-selected");

    function clearStudent() {
      selectedInput.value = "";
      selectedLabel.innerHTML = "";
      updateRequirementSelect();
    }

    function matchingStudents() {
      var sectionId = sectionSelect.value;
      if (!sectionId) return [];
      var term = App.normalizeSearch(searchInput.value.trim());

      return App.state.enrollments
        .filter(function (enrollment) {
          return enrollment.cycleId === cycleId &&
            enrollment.sectionId === sectionId &&
            enrollment.status !== "Retirada";
        })
        .map(function (enrollment) {
          return App.studentById(enrollment.studentId);
        })
        .filter(function (student) {
          if (!student) return false;

          var name = student.firstNames + " " + student.lastNames;
          var searchable = App.normalizeSearch(
            name + " " + student.code + " " +
            student.lastNames + " " + student.firstNames
          );

          return !term || searchable.indexOf(term) !== -1;
        })
        .sort(function (a, b) {
          return (a.firstNames + " " + a.lastNames)
            .localeCompare(b.firstNames + " " + b.lastNames);
        });
    }

    function renderMatches() {
      if (!sectionSelect.value) {
        results.innerHTML = '<p class="muted">Seleccione primero un grado y sección.</p>';
        return;
      }

      var students = matchingStudents();

      results.innerHTML = students.length
        ? students.map(function (student) {
            return '<button type="button" class="upload-student-option" data-student-id="' +
              App.escape(student.id) + '"><strong>' +
              App.escape(student.firstNames + " " + student.lastNames) +
              '</strong><small>' + App.escape(student.code) +
              '</small></button>';
          }).join("")
        : '<p class="muted">No se encontraron estudiantes en esta sección.</p>';
    }

    sectionSelect.addEventListener("change", function () {
      searchInput.disabled = !sectionSelect.value;
      searchInput.value = "";
      clearStudent();
      renderMatches();

      if (sectionSelect.value) searchInput.focus();
    });

    searchInput.addEventListener("input", function () {
      clearStudent();
      renderMatches();
    });

    results.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-student-id]");
      if (!button) return;

      var student = App.studentById(button.dataset.studentId);
      if (!student) return;

      selectedInput.value = student.id;
      searchInput.value = student.firstNames + " " + student.lastNames;

      selectedLabel.innerHTML =
        '<p class="upload-student-confirmed">✓ Seleccionado: <strong>' +
        App.escape(student.firstNames + " " + student.lastNames) +
        '</strong></p>';

      results.innerHTML = "";
      updateRequirementSelect();
    });
  }

  function updateRequirementSelect() {
    var studentInput = document.getElementById("upload-student");
    var select = document.getElementById("upload-requirement");
    var warning = document.getElementById("student-file-warning");

    if (!studentInput || !select || !warning) return;

    var studentId = studentInput.value;
    var cycleId = App.state.settings.selectedCycleId;

    warning.innerHTML = "";
    select.disabled = !studentId;

    if (!studentId) {
      select.innerHTML =
        '<option value="">Seleccione primero un estudiante</option>';
      return;
    }

    select.innerHTML = '<option value="">Seleccione documento...</option>' +
      App.state.requirements
        .filter(function (req) {
          return req.active;
        })
        .map(function (req) {
          var existing = App.state.studentDocuments.find(function (doc) {
            return doc.studentId === studentId &&
              doc.cycleId === cycleId &&
              doc.requirementId === req.id;
          });

          return '<option value="' + App.escape(req.id) + '">' +
            App.escape(req.name) +
            (existing
              ? ' · Entregado (creará v' + (existing.version + 1) + ')'
              : ' · Pendiente') +
            '</option>';
        }).join("");

    select.onchange = function () {
      var existing = App.state.studentDocuments.find(function (doc) {
        return doc.studentId === studentInput.value &&
          doc.cycleId === cycleId &&
          doc.requirementId === select.value;
      });

      warning.innerHTML = existing
        ? '<div class="alert alert-warning form-group">' +
          '<span>⚠</span><div>Este documento ya fue entregado. ' +
          'Se guardará una nueva versión sin borrar la anterior.</div></div>'
        : "";
    };
  }


  App.actions["save-upload-document"] = function () {
    var form = document.getElementById("upload-document-form");
    if (!form.reportValidity()) return;



    if (document.getElementById("upload-type").value === "student") {
      var sectionId = document.getElementById("upload-section").value;
      var studentId = document.getElementById("upload-student").value;

      var validEnrollment = App.state.enrollments.some(function (item) {
        return item.cycleId === App.state.settings.selectedCycleId &&
          item.sectionId === sectionId &&
          item.studentId === studentId &&
          item.status !== "Retirada";
      });

      if (!sectionId || !studentId || !validEnrollment) {
        App.toast(
          "Seleccione un grado, una sección y un estudiante válido.",
          "warning"
        );
        return;
      }
    }


    var data = new FormData(form);
    var type = data.get("type");
    var file = data.get("file");
    var validation = window.SGADStorage.validateFile(file);
    if (!validation.valid) { App.toast(validation.message, "error"); return; }
    var button = document.querySelector('[data-action="save-upload-document"]');
    button.disabled = true;
    button.textContent = "Guardando...";
    window.SGADStorage.putFile(file).then(function (fileRecord) {
      if (type === "institutional") saveInstitutionalUpload(data, fileRecord);
      else saveStudentUpload(data, fileRecord);
    }).catch(function (error) {
      button.disabled = false;
      button.textContent = "Guardar documento";
      App.toast(error.message || "No se pudo guardar el archivo.", "error");
    });
  };

  function saveInstitutionalUpload(data, fileRecord) {
    var cycle = App.selectedCycle();
    var number = App.state.repositoryDocuments.filter(function (x) { return x.cycleId === cycle.id; }).length + 1;
    var doc = {
      id: window.SGADStorage.createId("doc"), code: "DOC-" + cycle.year + "-" + String(number).padStart(3, "0"), cycleId: cycle.id,
      title: String(data.get("title")).trim(), categoryId: String(data.get("categoryId")), responsibleId: App.currentUser().id,
      documentDate: String(data.get("documentDate")), status: "Vigente", access: String(data.get("access")), description: String(data.get("description") || "").trim(),
      fileId: fileRecord.fileId, fileName: fileRecord.name, mimeType: fileRecord.type, fileSize: fileRecord.size, version: 1, versions: [], createdAt: App.nowIso()
    };
    try {
      App.state.repositoryDocuments.unshift(doc);
      App.audit("Subió documento institucional", "Repositorio", doc.code, doc.title + " · " + doc.fileName);
      App.closeModal();
      App.toast("Documento guardado en el repositorio.", "success");
      App.currentView = "repository";
      App.renderShell();
    } catch (error) {
      window.SGADStorage.deleteFile(fileRecord.fileId);
      throw error;
    }
  }

  function saveStudentUpload(data, fileRecord) {
    var studentId = String(data.get("studentId"));
    var requirementId = String(data.get("requirementId"));
    var cycleId = App.state.settings.selectedCycleId;
    var existing = App.state.studentDocuments.find(function (x) { return x.studentId === studentId && x.cycleId === cycleId && x.requirementId === requirementId; });
    var requirement = App.state.requirements.find(function (x) { return x.id === requirementId; });
    var student = App.studentById(studentId);
    try {
      if (existing) {
        existing.versions.push({ version: existing.version, fileId: existing.fileId, fileName: existing.fileName, mimeType: existing.mimeType, fileSize: existing.fileSize, replacedAt: App.nowIso(), reason: "Actualización desde carga unificada" });
        existing.version += 1;
        existing.fileId = fileRecord.fileId;
        existing.fileName = fileRecord.name;
        existing.mimeType = fileRecord.type;
        existing.fileSize = fileRecord.size;
        existing.uploadedAt = App.nowIso();
        existing.uploadedBy = App.currentUser().id;
        existing.notes = String(data.get("description") || "");
        App.audit("Actualizó documento de expediente", "Expedientes", student.code, requirement.name + " · " + fileRecord.name);
      } else {
        App.state.studentDocuments.push({ id: window.SGADStorage.createId("stdoc"), studentId: studentId, cycleId: cycleId, requirementId: requirementId, fileId: fileRecord.fileId, fileName: fileRecord.name, mimeType: fileRecord.type, fileSize: fileRecord.size, version: 1, versions: [], status: "Entregado", uploadedBy: App.currentUser().id, uploadedAt: App.nowIso(), notes: String(data.get("description") || "") });
        App.audit("Subió documento de expediente", "Expedientes", student.code, requirement.name + " · " + fileRecord.name);
      }
      App.closeModal();
      App.toast("Documento vinculado al expediente de " + student.firstNames + ".", "success");
      App.currentView = "enrollments";
      App.renderShell();
    } catch (error) {
      window.SGADStorage.deleteFile(fileRecord.fileId);
      throw error;
    }
  }

  App.actions["edit-document"] = function (element) {
    var doc = App.state.repositoryDocuments.find(function (x) { return x.id === element.dataset.id; });
    App.openModal({ size: "sm", eyebrow: "Repositorio", title: "Editar metadatos", body: '<form id="edit-document-form"><div class="form-group"><label class="required">Título</label><input class="input" name="title" value="' + App.escape(doc.title) + '" required></div><div class="form-group"><label class="required">Categoría</label><select class="input" name="categoryId">' + App.formOptions(App.state.documentCategories.filter(function (x) { return x.active; }), "id", "name", doc.categoryId) + '</select></div><div class="field-row"><div class="form-group"><label>Estado</label><select class="input" name="status"><option' + (doc.status === "Vigente" ? " selected" : "") + '>Vigente</option><option' + (doc.status === "Archivado" ? " selected" : "") + '>Archivado</option></select></div><div class="form-group"><label>Acceso</label><select class="input" name="access"><option' + (doc.access === "Solo Dirección" ? " selected" : "") + '>Solo Dirección</option><option' + (doc.access === "Dirección y docentes" ? " selected" : "") + '>Dirección y docentes</option></select></div></div><div class="form-group"><label>Descripción</label><textarea class="input" name="description">' + App.escape(doc.description || "") + '</textarea></div></form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-document-edit" data-id="' + doc.id + '">Guardar cambios</button>' });
  };

  App.actions["save-document-edit"] = function (element) {
    var form = document.getElementById("edit-document-form");
    if (!form.reportValidity()) return;
    var data = new FormData(form);
    var doc = App.state.repositoryDocuments.find(function (x) { return x.id === element.dataset.id; });
    doc.title = String(data.get("title")).trim();
    doc.categoryId = String(data.get("categoryId"));
    doc.status = String(data.get("status"));
    doc.access = String(data.get("access"));
    doc.description = String(data.get("description") || "").trim();
    App.audit("Editó metadatos", "Repositorio", doc.code, doc.title);
    App.closeModal(); App.toast("Metadatos actualizados.", "success"); App.renderShell();
  };

  App.actions["replace-document"] = function (element) {
    var doc = App.state.repositoryDocuments.find(function (x) { return x.id === element.dataset.id; });
    App.openModal({ size: "sm", eyebrow: "Control de versiones", title: "Reemplazar archivo", body: '<form id="replace-document-form"><div class="alert alert-info form-group"><span>i</span><div>La versión actual se conservará en el historial y la nueva será v' + (doc.version + 1) + '.</div></div><div class="form-group"><label class="required">Nuevo archivo</label><input class="input" type="file" name="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" required></div><div class="form-group"><label class="required">Motivo del reemplazo</label><textarea class="input" name="reason" required minlength="5"></textarea></div></form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-document-replacement" data-id="' + doc.id + '">Guardar nueva versión</button>' });
  };

  App.actions["save-document-replacement"] = function (element) {
    var form = document.getElementById("replace-document-form");
    if (!form.reportValidity()) return;
    var data = new FormData(form);
    var file = data.get("file");
    var validation = window.SGADStorage.validateFile(file);
    if (!validation.valid) { App.toast(validation.message, "error"); return; }
    var doc = App.state.repositoryDocuments.find(function (x) { return x.id === element.dataset.id; });
    return window.SGADStorage.putFile(file).then(function (record) {
      doc.versions.push({ version: doc.version, fileId: doc.fileId, fileName: doc.fileName, mimeType: doc.mimeType, fileSize: doc.fileSize, replacedAt: App.nowIso(), reason: String(data.get("reason")) });
      doc.version += 1; doc.fileId = record.fileId; doc.fileName = record.name; doc.mimeType = record.type; doc.fileSize = record.size;
      App.audit("Reemplazó archivo", "Repositorio", doc.code, doc.title + " · v" + doc.version + " · " + record.name);
      App.closeModal(); App.toast("Nueva versión guardada.", "success"); App.renderShell();
    });
  };

  App.actions["trash-document"] = function (element) {
    var doc = App.state.repositoryDocuments.find(function (x) { return x.id === element.dataset.id; });
    App.confirm("Enviar documento a papelera", "El documento dejará el repositorio, pero podrá restaurarse posteriormente.", function () {
      App.state.repositoryDocuments = App.state.repositoryDocuments.filter(function (x) { return x.id !== doc.id; });
      App.state.trash.unshift({ id: window.SGADStorage.createId("trash"), entityType: "repositoryDocument", originalId: doc.id, originalDoc: doc, deletedAt: App.nowIso(), deletedBy: App.currentUser().id, reason: "Eliminado desde el repositorio" });
      App.audit("Envió a papelera", "Repositorio", doc.code, doc.title);
      App.toast("Documento enviado a la papelera.", "success"); App.renderShell();
    }, true);
  };

  App.actions["manage-categories"] = function () {
    App.openModal({ size: "sm", eyebrow: "Catálogo documental", title: "Categorías", body: '<form id="category-form"><div class="field-row"><div class="form-group"><label class="required">Nueva categoría</label><input class="input" name="name" required maxlength="60"></div><div class="form-group"><label>&nbsp;</label><button class="btn btn-primary btn-block" type="button" data-action="add-category">Agregar</button></div></div></form><ul class="list">' + App.state.documentCategories.map(function (cat) { return '<li class="list-item"><span class="list-icon">▤</span><div class="list-main"><strong>' + App.escape(cat.name) + '</strong><small>' + (cat.active ? "Activa" : "Desactivada") + '</small></div><button class="btn btn-secondary btn-sm" data-action="toggle-category" data-id="' + cat.id + '">' + (cat.active ? "Desactivar" : "Activar") + '</button></li>'; }).join("") + '</ul>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cerrar</button>' });
  };

  App.actions["add-category"] = function () {
    var form = document.getElementById("category-form"); if (!form.reportValidity()) return;
    var name = new FormData(form).get("name").trim();
    if (App.state.documentCategories.some(function (x) { return App.normalizeSearch(x.name) === App.normalizeSearch(name); })) { App.toast("La categoría ya existe.", "warning"); return; }
    App.state.documentCategories.push({ id: window.SGADStorage.createId("cat"), name: name, active: true });
    App.audit("Creó categoría", "Repositorio", name, "Nueva categoría documental");
    App.actions["manage-categories"]();
  };

  App.actions["toggle-category"] = function (element) {
    var category = App.state.documentCategories.find(function (x) { return x.id === element.dataset.id; });
    category.active = !category.active;
    App.audit(category.active ? "Activó categoría" : "Desactivó categoría", "Repositorio", category.id, category.name);
    App.actions["manage-categories"]();
  };

  App.pages.enrollments = function () {
    var cycle = App.selectedCycle();
    var sections = App.state.sections.filter(function (x) { return x.cycleId === cycle.id && x.active; }).sort(function (a,b) { return a.grade - b.grade; });
    var cards = sections.map(function (section) {
      var enrollments = App.state.enrollments.filter(function (x) { return x.cycleId === cycle.id && x.sectionId === section.id && x.status !== "Retirada"; });
      var incomplete = enrollments.filter(function (x) { return !App.studentFileStatus(x.studentId, cycle.id).complete; }).length;
      return '<article class="section-card"><div class="section-top"><div><p class="eyebrow">Grado y sección</p><h3>' + App.escape(section.label) + '</h3></div><span class="section-count">' + enrollments.length + '</span></div><p class="muted">Docente responsable: <strong>' + App.escape(App.userName(section.teacherId)) + '</strong></p><div class="section-foot">' + (incomplete ? '<span class="badge badge-warning">' + incomplete + ' incompletos</span>' : '<span class="badge badge-success">Expedientes al día</span>') + '<button class="btn btn-soft btn-sm" data-action="filter-section" data-id="' + section.id + '">Ver estudiantes</button></div></article>';
    }).join("");
    var rows = enrollmentRows(App.selectedEnrollments());
    var actions = App.isSelectedCycleWritable() ? '<button class="btn btn-primary" data-action="open-enrollment-form">Nueva matrícula</button>' : "";
    return '<div class="page">' + pageHead("Gestión escolar", "Expedientes", "Consulte estudiantes y documentos del ciclo " + cycle.year + ".", actions) + '<div class="toolbar"><input class="input" id="student-search" placeholder="Buscar estudiante, CUI o código..."><select class="input" id="student-section"><option value="">Todas las secciones</option>' + App.formOptions(sections, "id", "label") + '</select><select class="input" id="student-file-status"><option value="">Todos los expedientes</option><option value="complete">Completos</option><option value="incomplete">Incompletos</option></select></div><section class="grid-3 mb-0">' + (cards || App.empty("Sin secciones", "Este ciclo todavía no tiene secciones.")) + '</section><div class="table-card mt-20"><div class="table-wrap"><table><thead><tr><th>Estudiante</th><th>Código / CUI</th><th>Sección</th><th>Expediente</th><th>Acción</th></tr></thead><tbody id="student-rows">' + (rows || '<tr><td colspan="5">' + App.empty("Sin estudiantes", "No hay matrículas en el ciclo seleccionado.") + '</td></tr>') + '</tbody></table></div></div></div>';
  };

  function enrollmentRows(enrollments) {
    return enrollments.map(function (enrollment) {
      var student = App.studentById(enrollment.studentId);
      var section = App.sectionById(enrollment.sectionId);
      var status = App.studentFileStatus(enrollment.studentId, enrollment.cycleId);
      if (!student) return "";
      return '<tr><td><div class="cell-title">' + App.escape(student.firstNames + " " + student.lastNames) + '</div><div class="cell-sub">Encargado: ' + App.escape(student.guardian) + '</div></td><td><div>' + App.escape(student.code) + '</div><div class="cell-sub">' + App.escape(student.cui) + '</div></td><td>' + App.escape(section ? section.label : "Sin sección") + '</td><td>' + App.statusBadge(status.complete ? "Completo" : "Incompleto") + '<div class="cell-sub">' + status.delivered + '/' + status.total + ' documentos</div></td><td><button class="btn btn-soft btn-sm" data-action="view-student-file" data-id="' + student.id + '">Ver expediente</button></td></tr>';
    }).join("");
  }

  App.pageMounted.enrollments = function () {
    ["student-search", "student-section", "student-file-status"].forEach(function (id) { document.getElementById(id).addEventListener("input", filterStudents); });
  };

  function filterStudents() {
    var search = App.normalizeSearch(document.getElementById("student-search").value);
    var sectionId = document.getElementById("student-section").value;
    var fileStatus = document.getElementById("student-file-status").value;
    var cycleId = App.state.settings.selectedCycleId;
    var rows = App.state.enrollments.filter(function (enrollment) {
      if (enrollment.cycleId !== cycleId || enrollment.status === "Retirada") return false;
      var student = App.studentById(enrollment.studentId);
      var section = App.sectionById(enrollment.sectionId);
      var status = App.studentFileStatus(enrollment.studentId, cycleId);
      var haystack = App.normalizeSearch(student.firstNames + " " + student.lastNames + " " + student.cui + " " + student.code + " " + (section ? section.label : ""));
      return (!search || haystack.indexOf(search) >= 0) && (!sectionId || enrollment.sectionId === sectionId) && (!fileStatus || (fileStatus === "complete" ? status.complete : !status.complete));
    });
    document.getElementById("student-rows").innerHTML = rows.length ? enrollmentRows(rows) : '<tr><td colspan="5">' + App.empty("Sin coincidencias", "No se encontraron estudiantes con los filtros aplicados.") + '</td></tr>';
  }

  App.actions["filter-section"] = function (element) {
    document.getElementById("student-section").value = element.dataset.id;
    filterStudents();
    document.getElementById("student-rows").closest(".table-card").scrollIntoView({ behavior: "smooth" });
  };

  App.actions["view-student-file"] = function (element) { openStudentFile(element.dataset.id); };

  function openStudentFile(studentId) {
    var student = App.studentById(studentId);
    var cycleId = App.state.settings.selectedCycleId;
    
    var cycle = App.cycleById(cycleId);
    var canEdit = !!(cycle && cycle.status === "Activo");

    var enrollment = App.studentEnrollment(studentId, cycleId);
    var section = enrollment ? App.sectionById(enrollment.sectionId) : null;
    if (!student || !enrollment) { App.toast("No se encontró la matrícula seleccionada.", "error"); return; }
    var status = App.studentFileStatus(studentId, cycleId);
    var requirements = App.state.requirements.filter(function (x) { return x.active; }).map(function (req) {
      var doc = App.state.studentDocuments.find(function (x) { return x.studentId === studentId && x.cycleId === cycleId && x.requirementId === req.id; });
      
      return '<div class="requirement">' +
        '<span class="requirement-state ' + (doc ? "ok" : "missing") + '">' +
          (doc ? "✓" : "!") +
        '</span>' +

        '<div class="requirement-info">' +
          '<strong>' + App.escape(req.name) + '</strong>' +
          '<small>' +
            (doc
              ? "Entregado · v" + doc.version + " · " + App.escape(doc.fileName)
              : "Documento pendiente") +
          '</small>' +
        '</div>' +

        '<div class="table-actions">' +

          (doc
            ? '<button class="btn btn-soft btn-sm" data-action="preview-file" data-collection="studentDocuments" data-module="Expedientes" data-id="' + doc.id + '">Ver</button>' +
              '<button class="btn btn-secondary btn-sm" data-action="download-file" data-collection="studentDocuments" data-module="Expedientes" data-id="' + doc.id + '">Descargar</button>' +
              (canEdit
                ? '<button class="btn btn-secondary btn-sm" data-action="upload-student-requirement" data-student="' + studentId + '" data-requirement="' + req.id + '">Actualizar</button>'
                : '')
            : (canEdit
                ? '<button class="btn btn-primary btn-sm" data-action="upload-student-requirement" data-student="' + studentId + '" data-requirement="' + req.id + '">Subir</button>'
                : '<span class="text-muted">Solo consulta</span>')
          ) +

        '</div>' +
      '</div>';
    }).join("");
    App.openModal({ size: "lg", eyebrow: "Expediente estudiantil", title: student.firstNames + " " + student.lastNames, body: '<div class="detail-grid"><div class="detail-item"><label>Código personal</label><strong>' + App.escape(student.code) + '</strong></div><div class="detail-item"><label>CUI</label><strong>' + App.escape(student.cui) + '</strong></div><div class="detail-item"><label>Ciclo y sección</label><strong>' + App.escape(App.selectedCycle().year + " · " + (section ? section.label : "—")) + '</strong></div><div class="detail-item"><label>Docente responsable</label><strong>' + App.escape(section ? App.userName(section.teacherId) : "—") + '</strong></div><div class="detail-item"><label>Encargado</label><strong>' + App.escape(student.guardian + " · " + student.relationship) + '</strong></div><div class="detail-item"><label>Teléfono</label><strong>' + App.escape(student.phone) + '</strong></div><div class="detail-item"><label>Estado del expediente</label><strong>' + (status.complete ? "Completo" : "Incompleto") + '</strong></div><div class="detail-item"><label>Avance</label><strong>' + status.delivered + ' de ' + status.total + ' documentos</strong></div></div><h3 class="card-title mt-20">Lista de documentos</h3><div class="requirement-list">' + requirements + '</div>', 
      
footer: '<button class="btn btn-secondary" data-action="close-modal">Cerrar</button>' +
  (canEdit
    ? '<button class="btn btn-primary" data-action="upload-student-requirement" data-student="' + studentId + '">Subir documento</button>'
    : '')
 });
  }

  App.actions["upload-student-requirement"] = function (element) {
    
    
var cycle = App.cycleById(App.state.settings.selectedCycleId);

if (!cycle || cycle.status !== "Activo") {
  App.toast(
    "Este ciclo escolar es histórico. No se pueden agregar ni actualizar documentos.",
    "error"
  );
  return;
}


    var studentId = element.dataset.student;
    var selectedRequirement = element.dataset.requirement || "";
    var student = App.studentById(studentId);
    App.openModal({ size: "sm", eyebrow: "Expediente estudiantil", title: "Agregar documento", body: '<form id="single-student-upload"><div class="alert alert-info form-group"><span>i</span><div>Estudiante: <strong>' + App.escape(student.firstNames + " " + student.lastNames) + '</strong></div></div><div class="form-group"><label class="required">Documento</label><select class="input" name="requirementId" required><option value="">Seleccione...</option>' + App.formOptions(App.state.requirements.filter(function (x) { return x.active; }), "id", function (req) { var existing = App.state.studentDocuments.find(function (d) { return d.studentId === studentId && d.cycleId === App.state.settings.selectedCycleId && d.requirementId === req.id; }); return req.name + (existing ? " · actualizar" : " · pendiente"); }, selectedRequirement) + '</select></div><div class="form-group"><label class="required">Archivo</label><input class="input" name="file" type="file" accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" required></div><div class="form-group"><label>Observaciones</label><textarea class="input" name="notes"></textarea></div></form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-single-student-file" data-student="' + studentId + '">Guardar</button>' });
  };

  App.actions["save-single-student-file"] = function (element) {
    
    var cycleId = App.state.settings.selectedCycleId;
    var cycle = App.cycleById(cycleId);

    if (!cycle || cycle.status !== "Activo") {
      App.toast(
        "No se pueden guardar documentos en un ciclo cerrado.",
        "error"
      );
      return;
    }

    var form = document.getElementById("single-student-upload"); if (!form.reportValidity()) return;
    var data = new FormData(form); var file = data.get("file"); var validation = window.SGADStorage.validateFile(file);
    if (!validation.valid) { App.toast(validation.message, "error"); return; }
    var studentId = element.dataset.student; var requirementId = String(data.get("requirementId")); var cycleId = App.state.settings.selectedCycleId;
    return window.SGADStorage.putFile(file).then(function (record) {
      var existing = App.state.studentDocuments.find(function (x) { return x.studentId === studentId && x.cycleId === cycleId && x.requirementId === requirementId; });
      var requirement = App.state.requirements.find(function (x) { return x.id === requirementId; });
      if (existing) {
        existing.versions.push({ version: existing.version, fileId: existing.fileId, fileName: existing.fileName, mimeType: existing.mimeType, fileSize: existing.fileSize, replacedAt: App.nowIso(), reason: "Actualización desde expediente" });
        existing.version += 1; existing.fileId = record.fileId; existing.fileName = record.name; existing.mimeType = record.type; existing.fileSize = record.size; existing.uploadedAt = App.nowIso(); existing.uploadedBy = App.currentUser().id; existing.notes = String(data.get("notes") || "");
        App.audit("Actualizó documento de expediente", "Expedientes", App.studentById(studentId).code, requirement.name + " · " + record.name);
      } else {
        App.state.studentDocuments.push({ id: window.SGADStorage.createId("stdoc"), studentId: studentId, cycleId: cycleId, requirementId: requirementId, fileId: record.fileId, fileName: record.name, mimeType: record.type, fileSize: record.size, version: 1, versions: [], status: "Entregado", uploadedBy: App.currentUser().id, uploadedAt: App.nowIso(), notes: String(data.get("notes") || "") });
        App.audit("Subió documento de expediente", "Expedientes", App.studentById(studentId).code, requirement.name + " · " + record.name);
      }
      App.toast("Documento guardado en el expediente.", "success"); openStudentFile(studentId);
    });
  };

  App.actions["open-enrollment-form"] = function () {
    if (!App.isSelectedCycleWritable()) { App.toast("El ciclo seleccionado está cerrado.", "warning"); return; }
    App.openModal({ size: "lg", eyebrow: "Gestión escolar", title: "Nueva matrícula", body: '<form id="enrollment-form"><div class="form-group"><label class="required">Modalidad</label><select class="input" id="enrollment-mode" name="mode"><option value="new">Registrar estudiante nuevo</option><option value="existing">Reinscribir estudiante existente</option></select></div><div id="enrollment-fields"></div></form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-enrollment">Guardar matrícula</button>' });
    renderEnrollmentFields("new");
    document.getElementById("enrollment-mode").addEventListener("change", function (event) { renderEnrollmentFields(event.target.value); });
  };

  function sectionOptions() {
    var sections = App.state.sections.filter(function (x) { return x.cycleId === App.state.settings.selectedCycleId && x.active; }).sort(function (a,b) { return a.grade - b.grade; });
    return '<option value="">Seleccione...</option>' + App.formOptions(sections, "id", function (s) { return s.label + " · " + App.userName(s.teacherId); });
  }

  function renderEnrollmentFields(mode) {
    var target = document.getElementById("enrollment-fields");
    if (mode === "existing") {
      var enrolledIds = new Set(App.selectedEnrollments().map(function (x) { return x.studentId; }));
      var available = App.state.studentIdentities.filter(function (x) { return !enrolledIds.has(x.id); });
      target.innerHTML = '<div class="form-group"><label class="required">Estudiante existente</label><select class="input" name="studentId" required><option value="">Buscar y seleccionar...</option>' + App.formOptions(available, "id", function (s) { return s.firstNames + " " + s.lastNames + " · " + s.cui; }) + '</select></div><div class="form-group"><label class="required">Grado y sección</label><select class="input" name="sectionId" required>' + sectionOptions() + '</select></div><div class="alert alert-info"><span>i</span><div>Se conservarán la identidad y los documentos permanentes del estudiante.</div></div>';
    } else {
      target.innerHTML = '<div class="field-row"><div class="form-group"><label class="required">Nombres</label><input class="input" name="firstNames" required></div><div class="form-group"><label class="required">Apellidos</label><input class="input" name="lastNames" required></div></div><div class="field-row three"><div class="form-group"><label class="required">CUI</label><input class="input" name="cui" inputmode="numeric" pattern="[0-9]{13}" maxlength="13" required></div><div class="form-group"><label class="required">Fecha de nacimiento</label><input class="input" name="birthDate" type="date" required></div><div class="form-group"><label class="required">Género</label><select class="input" name="gender"><option>Femenino</option><option>Masculino</option><option>Otro</option></select></div></div><div class="form-group"><label class="required">Dirección de residencia</label><input class="input" name="address" required></div><div class="field-row three"><div class="form-group"><label class="required">Nombre del encargado</label><input class="input" name="guardian" required></div><div class="form-group"><label class="required">Parentesco</label><input class="input" name="relationship" required value="Madre"></div><div class="form-group"><label class="required">Teléfono</label><input class="input" name="phone" inputmode="numeric" pattern="[0-9]{8}" maxlength="8" required></div></div><div class="form-group"><label class="required">Grado y sección</label><select class="input" name="sectionId" required>' + sectionOptions() + '</select></div>';
    }
  }

  App.actions["save-enrollment"] = function () {
    var form = document.getElementById("enrollment-form"); if (!form.reportValidity()) return;
    var data = new FormData(form); var mode = String(data.get("mode")); var cycle = App.selectedCycle(); var student;
    if (mode === "new") {
      var cui = String(data.get("cui"));
      if (App.state.studentIdentities.some(function (x) { return x.cui === cui; })) { App.toast("Ya existe un estudiante registrado con ese CUI.", "error"); return; }
      var birth = new Date(String(data.get("birthDate")) + "T12:00:00"); var age = cycle.year - birth.getFullYear();
      if (age < 4 || age > 16) { App.toast("La edad indicada está fuera del rango escolar esperado.", "error"); return; }
      var sequence = App.state.studentIdentities.reduce(function (max, item) { var n = Number(String(item.code).split("-").pop()); return Math.max(max, n || 0); }, 0) + 1;
      student = { id: window.SGADStorage.createId("stu"), code: "EORM-" + cycle.year + "-" + String(sequence).padStart(3, "0"), firstNames: String(data.get("firstNames")).trim(), lastNames: String(data.get("lastNames")).trim(), cui: cui, birthDate: String(data.get("birthDate")), gender: String(data.get("gender")), address: String(data.get("address")).trim(), guardian: String(data.get("guardian")).trim(), relationship: String(data.get("relationship")).trim(), phone: String(data.get("phone")), createdAt: App.nowIso() };
      App.state.studentIdentities.push(student);
    } else {
      student = App.studentById(String(data.get("studentId")));
      if (!student) { App.toast("Seleccione un estudiante válido.", "error"); return; }
    }
    if (App.studentEnrollment(student.id, cycle.id)) { App.toast("El estudiante ya posee matrícula en este ciclo.", "error"); return; }
    App.state.enrollments.push({ id: window.SGADStorage.createId("enr"), studentId: student.id, cycleId: cycle.id, sectionId: String(data.get("sectionId")), status: "Activa", enrolledAt: App.nowIso() });
    App.audit(mode === "new" ? "Registró matrícula" : "Reinscribió estudiante", "Matrículas", student.code, student.firstNames + " " + student.lastNames);
    App.closeModal(); App.toast("Matrícula guardada correctamente.", "success"); App.renderShell();
  };

  App.pages.cycles = function () {
    var cycle = App.selectedCycle();
    var sections = App.state.sections.filter(function (x) { return x.cycleId === cycle.id; }).sort(function (a,b) { return a.grade - b.grade; });
    var cards = sections.map(function (section) {
      var total = App.state.enrollments.filter(function (x) { return x.cycleId === cycle.id && x.sectionId === section.id && x.status !== "Retirada"; }).length;
      return '<article class="section-card"><div class="section-top"><div><p class="eyebrow">Grado y sección</p><h3>' + App.escape(section.label) + '</h3></div><span class="section-count">' + total + '</span></div><p class="muted">Responsable principal</p><strong>' + App.escape(App.userName(section.teacherId)) + '</strong><div class="section-foot"><span>' + App.statusBadge(section.active ? "Activo" : "Inactivo") + '</span>' + (cycle.status === "Activo" ? '<button class="btn btn-soft btn-sm" data-action="assign-section-teacher" data-id="' + section.id + '">Configurar</button>' : '<span class="muted">Solo consulta</span>') + '</div></article>';
    }).join("");
    var actions = (cycle.status === "Activo" ? '<button class="btn btn-secondary" data-action="open-section-form">Agregar sección</button>' : "") + '<button class="btn btn-primary" data-action="open-cycle-form">Crear ciclo</button>';
    
    if (cycle.id !== App.state.settings.activeCycleId) {
      actions += '<button class="btn btn-danger" ' +
        'data-action="delete-empty-cycle" ' +
        'data-id="' + App.escape(cycle.id) + '">' +
        'Eliminar ciclo vacío</button>';
    }

    return '<div class="page">' + pageHead("Estructura escolar", "Ciclo escolar", "Administre la organización y los responsables de cada ciclo.", actions) + '<article class="card mb-0"><div class="card-head"><div><h2 class="card-title">Ciclo ' + cycle.year + '</h2><p class="card-subtitle">' + App.formatDate(cycle.startDate) + ' al ' + App.formatDate(cycle.endDate) + '</p></div><div>' + App.statusBadge(cycle.status) + (cycle.status === "Activo" ? ' <button class="btn btn-warning btn-sm" data-action="close-cycle" data-id="' + cycle.id + '">Cerrar ciclo</button>' : "") + '</div></div><div class="alert ' + (cycle.status === "Activo" ? "alert-success" : "alert-info") + '"><span>i</span><div>' + (cycle.status === "Activo" ? "Este ciclo permite matrículas, documentos y cambios de estructura." : "Este ciclo es histórico y se encuentra disponible únicamente para consulta.") + '</div></div></article><section class="grid-3 mt-20">' + (cards || App.empty("Sin estructura", "Este ciclo todavía no tiene grados ni secciones.")) + '</section></div>';
  };

  App.actions["open-cycle-form"] = function () {
    var maxYear = Math.max.apply(
      null,
      App.state.cycles.map(function (x) {
        return x.year;
      })
    );

    var nextYear = maxYear + 1;

    var body =
      '<form id="cycle-form">' +
      '<div class="stepper">' +
        '<span class="step done"></span>' +
        '<span class="step active"></span>' +
        '<span class="step"></span>' +
        '<span class="step"></span>' +
      '</div>' +

      '<div class="field-row three">' +
        '<div class="form-group">' +
          '<label class="required">Año</label>' +
          '<input class="input" type="number" name="year" min="2026" max="2100" value="' + nextYear + '" required>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="required">Fecha de inicio</label>' +
          '<input class="input" type="date" name="startDate" value="' + nextYear + '-01-05" required>' +
        '</div>' +

        '<div class="form-group">' +
          '<label class="required">Fecha de finalización</label>' +
          '<input class="input" type="date" name="endDate" value="' + nextYear + '-10-30" required>' +
        '</div>' +
      '</div>' +

      '<div class="check-grid">' +
        '<label class="check-item">' +
          '<input type="checkbox" name="copyStructure" checked>' +
          '<span><strong>Copiar grados y secciones</strong>' +
          '<small class="muted">Utilizar la estructura del ciclo activo.</small></span>' +
        '</label>' +

        '<label class="check-item">' +
          '<input type="checkbox" name="copyTeachers" checked>' +
          '<span><strong>Conservar responsables</strong>' +
          '<small class="muted">Asignar los mismos docentes.</small></span>' +
        '</label>' +

        '<label class="check-item">' +
          '<input type="checkbox" name="promote">' +
          '<span><strong>Promover estudiantes</strong>' +
          '<small class="muted">Crear matrículas en el grado siguiente.</small></span>' +
        '</label>' +
      '</div>' +

      '<div class="alert alert-warning mt-20">' +
        '<span>⚠</span>' +
        '<div>Revise los datos. El nuevo ciclo se creará como activo y el ciclo anterior se cerrará automáticamente, quedando disponible únicamente para consulta.</div>' +
      '</div>' +
      '</form>';

    App.openModal({
      size: "lg",
      eyebrow: "Nuevo ciclo escolar",
      title: "Preparar ciclo " + nextYear,
      body: body,
      footer:
        '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button>' +
        '<button class="btn btn-primary" data-action="save-cycle">Crear ciclo</button>'
    });
  };

  App.actions["open-section-form"] = function () {
    var teachers = App.state.users.filter(function (x) { return x.role === "docente" && x.active; });
    App.openModal({ size: "sm", eyebrow: "Estructura escolar", title: "Agregar grado y sección", body: '<form id="section-form"><div class="field-row"><div class="form-group"><label class="required">Grado</label><select class="input" name="grade" required><option value="1">Primero</option><option value="2">Segundo</option><option value="3">Tercero</option><option value="4">Cuarto</option><option value="5">Quinto</option><option value="6">Sexto</option></select></div><div class="form-group"><label class="required">Sección</label><input class="input" name="sectionLetter" maxlength="2" value="A" required></div></div><div class="form-group"><label>Docente responsable</label><select class="input" name="teacherId"><option value="">Asignar después</option>' + App.formOptions(teachers, "id", "name") + '</select></div><p class="input-hint">La sección tendrá un único responsable principal; el docente puede atender otras secciones.</p></form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-section">Agregar sección</button>' });
  };

  App.actions["save-section"] = function () {
    var form = document.getElementById("section-form"); if (!form.reportValidity()) return;
    var data = new FormData(form); var grade = Number(data.get("grade")); var letter = String(data.get("sectionLetter")).trim().toUpperCase();
    var names = ["", "Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto"]; var label = names[grade] + " " + letter; var cycleId = App.state.settings.selectedCycleId;
    if (App.state.sections.some(function (x) { return x.cycleId === cycleId && App.normalizeSearch(x.label) === App.normalizeSearch(label); })) { App.toast("La sección " + label + " ya existe en este ciclo.", "error"); return; }
    var section = { id: window.SGADStorage.createId("sec"), cycleId: cycleId, grade: grade, label: label, teacherId: String(data.get("teacherId") || "") || null, active: true };
    App.state.sections.push(section); App.audit("Creó sección", "Ciclos", label, section.teacherId ? "Responsable: " + App.userName(section.teacherId) : "Sin responsable");
    App.closeModal(); App.toast("Sección agregada.", "success"); App.renderShell();
  };


  App.actions["save-cycle"] = function () {
    var form = document.getElementById("cycle-form");
    if (!form || !form.reportValidity()) return;

    var data = new FormData(form);
    var year = Number(data.get("year"));
    var startDate = String(data.get("startDate"));
    var endDate = String(data.get("endDate"));
    var copyStructure = !!data.get("copyStructure");
    var copyTeachers = !!data.get("copyTeachers");
    var promote = !!data.get("promote");

    if (!Number.isInteger(year) || year < 2026 || year > 2100) {
      App.toast("Ingrese un año escolar válido.", "error");
      return;
    }

    if (App.state.cycles.some(function (cycle) {
      return cycle.year === year || cycle.id === "cy-" + year;
    })) {
      App.toast("Ya existe un ciclo escolar para ese año.", "error");
      return;
    }

    if (!startDate || !endDate || endDate <= startDate) {
      App.toast(
        "La fecha final debe ser posterior a la inicial.",
        "error"
      );
      return;
    }

    if (promote && !copyStructure) {
      App.toast(
        "Para promover estudiantes debe copiar la estructura.",
        "error"
      );
      return;
    }

    var oldCycle = App.activeCycle();

    if (!oldCycle) {
      App.toast(
        "No se encontró el ciclo vigente.",
        "error"
      );
      return;
    }

    if (year <= oldCycle.year) {
      App.toast(
        "El nuevo ciclo debe ser posterior al ciclo vigente.",
        "error"
      );
      return;
    }

    var sourceSections = App.state.sections.filter(function (section) {
      return section.cycleId === oldCycle.id && section.active;
    });

    // Detectar secciones con IDs duplicados antes de copiar.
    var seenIds = new Set();

    var duplicateIds = sourceSections.filter(function (section) {
      if (seenIds.has(section.id)) return true;
      seenIds.add(section.id);
      return false;
    });

    if (duplicateIds.length) {
      App.toast(
        "El ciclo de origen tiene secciones con IDs duplicados. " +
        "Primero deben repararse sus datos.",
        "error"
      );
      return;
    }

    if (copyStructure && !sourceSections.length) {
      App.toast(
        "El ciclo de origen no tiene secciones activas.",
        "error"
      );
      return;
    }

    var newId = "cy-" + year;
    var newSections = [];
    var newEnrollments = [];
    var skipped = 0;

    if (copyStructure) {
      sourceSections.forEach(function (oldSection) {
        newSections.push({
          id: window.SGADStorage.createId("sec"),
          cycleId: newId,
          grade: oldSection.grade,
          label: oldSection.label,
          teacherId: copyTeachers ? oldSection.teacherId : null,
          active: true
        });
      });

      if (promote) {
        var sourceEnrollments = App.state.enrollments.filter(
          function (enrollment) {
            return enrollment.cycleId === oldCycle.id &&
              enrollment.status !== "Retirada";
          }
        );

        sourceEnrollments.forEach(function (enrollment) {
          var oldSection = sourceSections.find(function (section) {
            return section.id === enrollment.sectionId;
          });

          if (!oldSection || oldSection.grade >= 6) {
            skipped++;
            return;
          }

          var nextGrade = oldSection.grade + 1;

          // Conservar la letra de la sección al promover:
          // Primero B pasa a Segundo B, si existe.
          var oldLetter = String(oldSection.label || "")
            .trim()
            .split(/\s+/)
            .pop()
            .toUpperCase();

          var destination = newSections.find(function (section) {
            var newLetter = String(section.label || "")
              .trim()
              .split(/\s+/)
              .pop()
              .toUpperCase();

            return section.grade === nextGrade &&
              newLetter === oldLetter;
          });

          // No asignar silenciosamente alumnos B a la A.
          if (!destination) {
            skipped++;
            return;
          }

          newEnrollments.push({
            id: window.SGADStorage.createId("enr"),
            studentId: enrollment.studentId,
            cycleId: newId,
            sectionId: destination.id,
            status: "Activa",
            enrolledAt: App.nowIso()
          });
        });
      }
    }

    // Preparar el cambio sin modificar el estado original.
    var nextState = window.SGADStorage.clone(App.state);

    nextState.cycles.forEach(function (cycle) {
      if (cycle.status === "Activo") {
        cycle.status = "Cerrado";
        cycle.name = cycle.year + " · Histórico";
      }
    });

    nextState.cycles.push({
      id: newId,
      year: year,
      name: year + " · Actual",
      startDate: startDate,
      endDate: endDate,
      status: "Activo"
    });

    Array.prototype.push.apply(nextState.sections, newSections);
    Array.prototype.push.apply(nextState.enrollments, newEnrollments);

    nextState.settings.activeCycleId = newId;
    nextState.settings.selectedCycleId = newId;

    // Guardar una sola vez el conjunto de cambios.
    try {
      App.state = window.SGADStorage.saveState(nextState);
    } catch (error) {
      App.toast(
        "No fue posible crear el ciclo: " + error.message,
        "error"
      );
      return;
    }

    App.audit(
      "Creó ciclo escolar",
      "Ciclos",
      String(year),
      "Copió " + newSections.length +
      " secciones; promovió " + newEnrollments.length +
      " estudiantes; omitió " + skipped + "."
    );

    App.closeModal();

    App.toast(
      "Ciclo " + year + " creado correctamente. " +
      newEnrollments.length + " estudiantes promovidos" +
      (skipped ? " y " + skipped + " sin promoción automática." : "."),
      skipped ? "warning" : "success"
    );

    App.renderShell();
  };


  App.actions["assign-section-teacher"] = function (element) {
    var section = App.sectionById(element.dataset.id);
    var teachers = App.state.users.filter(function (x) { return x.role === "docente" && x.active; });
    App.openModal({ size: "sm", eyebrow: "Configuración de sección", title: section.label, body: '<form id="assign-teacher-form"><div class="form-group"><label>Responsable actual</label><div class="alert alert-info"><span>♟</span><div>' + App.escape(section.teacherId ? App.userName(section.teacherId) : "Sin responsable") + '</div></div></div><div class="form-group"><label>Nuevo responsable</label><select class="input" name="teacherId"><option value="">Sin responsable</option>' + App.formOptions(teachers, "id", function (u) { var assigned = App.teacherSections(u.id, section.cycleId).map(function (s) { return s.label; }).join(" y "); return u.name + (assigned ? " · " + assigned : ""); }, section.teacherId) + '</select></div><p class="input-hint">Un docente puede atender varias secciones. Esta sección mantendrá un único responsable principal.</p></form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-section-teacher" data-id="' + section.id + '">Guardar asignación</button>' });
  };

  App.actions["save-section-teacher"] = function (element) {
    var form = document.getElementById("assign-teacher-form"); if (!form.reportValidity()) return;
    var section = App.sectionById(element.dataset.id); var old = section.teacherId; var teacherId = String(new FormData(form).get("teacherId"));
    section.teacherId = teacherId || null;
    App.audit("Actualizó responsable de sección", "Ciclos", section.label, (old ? App.userName(old) : "Sin responsable") + " → " + (teacherId ? App.userName(teacherId) : "Sin responsable"));
    App.closeModal(); App.toast("Responsable actualizado.", "success"); App.renderShell();
  };

  App.actions["close-cycle"] = function (element) {
    var cycle = App.cycleById(element.dataset.id);
    App.confirm("Cerrar ciclo " + cycle.year, "Las acciones de escritura quedarán bloqueadas. La información seguirá disponible para consulta.", function () {
      cycle.status = "Cerrado"; cycle.name = cycle.year + " · Histórico";
      App.audit("Cerró ciclo escolar", "Ciclos", String(cycle.year), "Ciclo cerrado para escritura");
      App.toast("Ciclo cerrado.", "success"); App.renderShell();
    }, true);
  };

  App.pages.requests = function () {
    var cycleId = App.state.settings.selectedCycleId;
    var requests = App.state.deliveryRequests.filter(function (x) { return x.cycleId === cycleId; }).sort(function (a,b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    var cards = requests.map(function (request) {
      var delivered = request.targetUserIds.filter(function (teacherId) { return App.state.submissions.some(function (s) { return s.requestId === request.id && s.teacherId === teacherId; }); }).length;
      var percent = request.targetUserIds.length ? Math.round(delivered * 100 / request.targetUserIds.length) : 0;
      return '<article class="card"><div class="card-head"><div><h2 class="card-title">' + App.escape(request.title) + '</h2><p class="card-subtitle">Vence ' + App.formatDate(request.dueDate) + ' · ' + App.escape(request.allowedFormats.join(", ")) + '</p></div>' + App.statusBadge(request.status) + '</div><p>' + App.escape(request.description) + '</p><div class="progress"><span style="width:' + percent + '%"></span></div><div class="section-foot"><span><strong>' + delivered + '/' + request.targetUserIds.length + '</strong> docentes entregaron</span><div class="table-actions"><button class="btn btn-soft btn-sm" data-action="request-compliance" data-id="' + request.id + '">Ver cumplimiento</button>' + (request.status === "Vigente" && App.isSelectedCycleWritable() ? '<button class="btn btn-secondary btn-sm" data-action="close-request" data-id="' + request.id + '">Cerrar</button>' : "") + '</div></div></article>';
    }).join("");
    var actions = App.isSelectedCycleWritable() ? '<button class="btn btn-primary" data-action="open-request-form">Crear solicitud</button>' : "";
    return '<div class="page">' + pageHead("Gestión documental", "Solicitudes de entrega", "Solicite documentos y supervise el cumplimiento de cada docente.", actions) + '<section class="grid-2">' + (cards || App.empty("Sin solicitudes", "Todavía no se han creado solicitudes para este ciclo.")) + '</section></div>';
  };

  App.actions["open-request-form"] = function () {
    if (!App.isSelectedCycleWritable()) { App.toast("No puede crear solicitudes en un ciclo cerrado.", "warning"); return; }
    var teachers = App.state.users.filter(function (x) { return x.role === "docente" && x.active; });
    var checks = teachers.map(function (teacher) { var scope = App.teacherSections(teacher.id, App.state.settings.selectedCycleId).map(function (s) { return s.label; }).join(" y ") || "Sin sección"; return '<label class="check-item"><input type="checkbox" name="targetUserIds" value="' + teacher.id + '"><span><strong>' + App.escape(teacher.name) + '</strong><small class="muted">' + App.escape(scope) + '</small></span></label>'; }).join("");
    App.openModal({ size: "lg", eyebrow: "Nueva convocatoria", title: "Crear solicitud de entrega", body: '<form id="request-form"><div class="form-group"><label class="required">Título</label><input class="input" name="title" required maxlength="120"></div><div class="form-group"><label class="required">Descripción e instrucciones</label><textarea class="input" name="description" required></textarea></div><div class="field-row three"><div class="form-group"><label>Categoría</label><select class="input" name="categoryId">' + App.formOptions(App.state.documentCategories.filter(function (x) { return x.active; }), "id", "name", "cat-evi") + '</select></div><div class="form-group"><label class="required">Fecha límite</label><input class="input" name="dueDate" type="date" min="' + App.todayIso() + '" required></div><div class="form-group"><label>Prioridad</label><select class="input" name="priority"><option>Normal</option><option>Alta</option></select></div></div><div class="form-group"><label class="required">Formatos permitidos</label><div class="check-grid"><label class="check-item"><input type="checkbox" name="formats" value="PDF" checked> PDF</label><label class="check-item"><input type="checkbox" name="formats" value="DOCX"> DOCX</label><label class="check-item"><input type="checkbox" name="formats" value="XLSX"> XLSX</label><label class="check-item"><input type="checkbox" name="formats" value="PNG"> PNG/JPG</label></div></div><div class="form-group"><label class="required">Destinatarios</label><div class="radio-group"><label class="radio-card"><input type="radio" name="targetMode" value="all" checked><span><strong>Todos los docentes</strong><small class="muted">Enviar a los cuatro docentes activos.</small></span></label><label class="radio-card"><input type="radio" name="targetMode" value="selected"><span><strong>Docentes seleccionados</strong><small class="muted">Elegir destinatarios específicos.</small></span></label></div></div><div id="teacher-selection" class="check-grid hidden">' + checks + '</div></form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-request">Crear solicitud</button>' });
    document.querySelectorAll('input[name="targetMode"]').forEach(function (radio) { radio.addEventListener("change", function () { document.getElementById("teacher-selection").classList.toggle("hidden", radio.value !== "selected" || !radio.checked); }); });
  };

  App.actions["save-request"] = function () {
    var form = document.getElementById("request-form"); if (!form.reportValidity()) return;
    var data = new FormData(form); var mode = String(data.get("targetMode")); var teachers = App.state.users.filter(function (x) { return x.role === "docente" && x.active; });
    var targets = mode === "all" ? teachers.map(function (x) { return x.id; }) : data.getAll("targetUserIds").map(String);
    var formats = data.getAll("formats").map(String);
    if (!targets.length) { App.toast("Seleccione al menos un docente.", "error"); return; }
    if (!formats.length) { App.toast("Seleccione al menos un formato permitido.", "error"); return; }
    var request = { id: window.SGADStorage.createId("delreq"), cycleId: App.state.settings.selectedCycleId, title: String(data.get("title")).trim(), description: String(data.get("description")).trim(), categoryId: String(data.get("categoryId")), allowedFormats: formats, dueDate: String(data.get("dueDate")), priority: String(data.get("priority")), targetUserIds: targets, status: "Vigente", createdBy: App.currentUser().id, createdAt: App.nowIso() };
    App.state.deliveryRequests.unshift(request);
    targets.forEach(function (teacherId) { App.notify(teacherId, "Nueva entrega solicitada", request.title + " · vence " + App.formatDate(request.dueDate), "teacher-requests", request.id, "request"); });
    App.audit("Creó solicitud", "Solicitudes", request.id, request.title + " · " + targets.length + " destinatarios");
    App.closeModal(); App.toast("Solicitud enviada a los docentes.", "success"); App.renderShell();
  };

  App.actions["request-compliance"] = function (element) {
    var request = App.state.deliveryRequests.find(function (x) { return x.id === element.dataset.id; });
    if (!request) return;
    var rows = request.targetUserIds.map(function (teacherId) {
      var submission = App.state.submissions.find(function (x) { return x.requestId === request.id && x.teacherId === teacherId; });
      return '<tr><td>' + App.escape(App.userName(teacherId)) + '</td><td>' + App.escape(App.teacherSections(teacherId, request.cycleId).map(function (s) { return s.label; }).join(" y ") || "Sin sección") + '</td><td>' + App.statusBadge(submission ? submission.status : (request.dueDate < App.todayIso() ? "Vencido" : "Pendiente")) + '</td><td>' + (submission ? App.formatDate(submission.submittedAt, true) : "—") + '</td><td>' + (submission ? '<button class="btn btn-soft btn-sm" data-action="view-submission" data-id="' + submission.id + '">Abrir</button>' : "—") + '</td></tr>';
    }).join("");
    App.openModal({ size: "lg", eyebrow: "Cumplimiento docente", title: request.title, body: '<div class="table-wrap"><table><thead><tr><th>Docente</th><th>Alcance</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>' + rows + '</tbody></table></div>', footer: '<button class="btn btn-primary" data-action="close-modal">Cerrar</button>' });
  };

  App.actions["close-request"] = function (element) {
    var request = App.state.deliveryRequests.find(function (x) { return x.id === element.dataset.id; });
    App.confirm("Cerrar solicitud", "Los docentes ya no podrán realizar nuevas entregas para esta solicitud.", function () { request.status = "Cerrada"; App.audit("Cerró solicitud", "Solicitudes", request.id, request.title); App.toast("Solicitud cerrada.", "success"); App.renderShell(); });
  };

  App.pages.users = function () {
    var cycleId = App.state.settings.selectedCycleId;
    var rows = App.state.users.map(function (user) {
      var scope = user.role === "directora" ? "Todo el establecimiento" : App.teacherSections(user.id, cycleId).map(function (s) { return s.label; }).join(" y ") || "Sin sección asignada";
      return '<tr><td><div class="cell-title">' + App.escape(user.name) + '</div><div class="cell-sub">' + App.escape(user.email) + '</div></td><td>' + (user.role === "directora" ? "Directora" : "Docente") + '</td><td>' + App.escape(scope) + '</td><td>' + App.statusBadge(user.active ? "Activo" : "Inactivo") + '</td><td><button class="btn btn-soft btn-sm" data-action="manage-user" data-id="' + user.id + '">Administrar</button></td></tr>';
    }).join("");
    return '<div class="page">' + pageHead("Administración", "Usuarios y permisos", "Asigne accesos según la responsabilidad de cada persona.", '<button class="btn btn-primary" data-action="manage-user">Crear usuario</button>') + '<div class="table-card"><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol institucional</th><th>Alcance</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
  };

  App.actions["manage-user"] = function (element) {
    var user = element.dataset.id ? App.userById(element.dataset.id) : null;
    var isDirector = user && user.role === "directora";
    var sections = App.state.sections.filter(function (x) { return x.cycleId === App.state.settings.selectedCycleId && x.active; });
    var sectionChecks = sections.map(function (section) {
      var checked = user && section.teacherId === user.id;
      var occupied = section.teacherId && (!user || section.teacherId !== user.id);
      return '<label class="check-item"><input type="checkbox" name="sectionIds" value="' + section.id + '"' + (checked ? " checked" : "") + '><span><strong>' + App.escape(section.label) + '</strong><small class="muted">' + (occupied ? "Asignada a " + App.escape(App.userName(section.teacherId)) : checked ? "Asignación actual" : "Disponible") + '</small></span></label>';
    }).join("");
    var permissionNames = [
      ["viewStudents", "Ver estudiantes"], ["viewFiles", "Ver expedientes"], ["uploadStudentDocuments", "Subir documentos de expediente"], ["updateStudentDocuments", "Actualizar documentos"],
      ["viewRequests", "Ver solicitudes"], ["submitDeliveries", "Realizar entregas"], ["downloadDocuments", "Descargar documentos"], ["viewReceipts", "Consultar comprobantes"]
    ];
    var permissionChecks = permissionNames.map(function (item) { var checked = !user || (user.permissions && user.permissions[item[0]]); return '<label class="check-item"><input type="checkbox" name="permissions" value="' + item[0] + '"' + (checked ? " checked" : "") + '> <span>' + App.escape(item[1]) + '</span></label>'; }).join("");
    App.openModal({ size: "lg", eyebrow: "Administración de acceso", title: user ? "Administrar usuario" : "Crear usuario", body: '<form id="user-form"><div class="field-row"><div class="form-group"><label class="required">Nombre completo</label><input class="input" name="name" value="' + App.escape(user ? user.name : "") + '" required></div><div class="form-group"><label class="required">Correo institucional</label><input class="input" type="email" name="email" value="' + App.escape(user ? user.email : "") + '" required></div></div><div class="field-row"><div class="form-group"><label class="required">Rol</label><select class="input" name="role" id="user-role"' + (isDirector ? " disabled" : "") + '><option value="docente"' + (!user || user.role === "docente" ? " selected" : "") + '>Docente</option><option value="directora"' + (isDirector ? " selected" : "") + '>Directora</option></select></div><div class="form-group"><label>Estado</label><select class="input" name="active"><option value="true"' + (!user || user.active ? " selected" : "") + '>Activo</option><option value="false"' + (user && !user.active ? " selected" : "") + '>Inactivo</option></select></div></div>' + (isDirector ? '<div class="alert alert-info"><span>i</span><div>La cuenta principal de Dirección conserva todos los permisos administrativos.</div></div>' : '<h3 class="card-title">Secciones asignadas</h3><div class="check-grid mt-12">' + sectionChecks + '</div><h3 class="card-title mt-20">Permisos individuales</h3><div class="check-grid mt-12">' + permissionChecks + '</div>') + '</form>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-primary" data-action="save-user" data-id="' + (user ? user.id : "") + '">Guardar usuario</button>' });
  };

  App.actions["save-user"] = function (element) {
    var form = document.getElementById("user-form"); if (!form.reportValidity()) return;
    var data = new FormData(form); var existing = element.dataset.id ? App.userById(element.dataset.id) : null;
    var email = String(data.get("email")).trim().toLowerCase();
    if (App.state.users.some(function (x) { return x.email.toLowerCase() === email && (!existing || x.id !== existing.id); })) { App.toast("El correo ya pertenece a otro usuario.", "error"); return; }
    var selectedSections = data.getAll("sectionIds").map(String);
    var conflicts = selectedSections.map(App.sectionById).filter(function (section) { return section && section.teacherId && (!existing || section.teacherId !== existing.id); });
    if (conflicts.length) { App.toast("No se asignó: " + conflicts.map(function (s) { return s.label + " ya pertenece a " + App.userName(s.teacherId); }).join("; ") + ". Cambie primero el responsable de la sección.", "error"); return; }
    var permissionValues = data.getAll("permissions").map(String); var permissions = {};
    ["viewStudents", "viewFiles", "uploadStudentDocuments", "updateStudentDocuments", "viewRequests", "submitDeliveries", "downloadDocuments", "viewReceipts"].forEach(function (key) { permissions[key] = permissionValues.indexOf(key) >= 0; });
    if (existing) {
      existing.name = String(data.get("name")).trim(); existing.email = email; existing.active = String(data.get("active")) === "true";
      if (existing.role !== "directora") { existing.role = String(data.get("role") || "docente"); existing.permissions = permissions; }
      App.state.sections.filter(function (s) { return s.cycleId === App.state.settings.selectedCycleId && s.teacherId === existing.id; }).forEach(function (s) { if (selectedSections.indexOf(s.id) === -1) s.teacherId = null; });
      selectedSections.forEach(function (id) { App.sectionById(id).teacherId = existing.id; });
      App.audit("Actualizó usuario y permisos", "Usuarios", existing.email, existing.name);
    } else {
      var user = { id: window.SGADStorage.createId("usr"), name: String(data.get("name")).trim(), email: email, role: String(data.get("role") || "docente"), initials: String(data.get("name")).trim().split(/\s+/).slice(0,2).map(function (x) { return x[0]; }).join("").toUpperCase(), active: String(data.get("active")) === "true", permissions: permissions, createdAt: App.nowIso() };
      App.state.users.push(user); selectedSections.forEach(function (id) { App.sectionById(id).teacherId = user.id; });
      App.audit("Creó usuario", "Usuarios", user.email, user.name);
    }
    App.closeModal(); App.toast("Usuario y asignaciones guardados.", "success"); App.renderShell();
  };

  App.pages.reports = function () {
    return '<div class="page">' + pageHead("Análisis institucional", "Reportes", "Configure los filtros, revise una vista previa y después exporte.") + '<article class="card"><div class="field-row"><div class="form-group"><label class="required">Tipo de reporte</label><select class="input" id="report-type"><option value="enrollments">Matrículas por grado</option><option value="files">Estado de expedientes</option><option value="inventory">Inventario documental</option><option value="compliance">Cumplimiento de entregas</option></select></div><div class="form-group"><label>Ciclo escolar</label><input class="input" value="' + App.escape(App.selectedCycle().name) + '" disabled></div></div><div id="report-filters"></div><div class="page-actions"><button class="btn btn-primary" data-action="generate-report">Generar vista previa</button></div></article><div id="report-result"></div></div>';
  };

  App.pageMounted.reports = function () {
    document.getElementById("report-type").addEventListener("change", renderReportFilters);
    renderReportFilters();
  };

  function renderReportFilters() {
    var type = document.getElementById("report-type").value; var cycleId = App.state.settings.selectedCycleId; var target = document.getElementById("report-filters");
    var sections = App.state.sections.filter(function (x) { return x.cycleId === cycleId && x.active; });
    if (type === "enrollments") target.innerHTML = '<div class="field-row"><div class="form-group"><label>Grado o sección</label><select class="input" id="report-section"><option value="">Todos los grados</option>' + App.formOptions(sections, "id", "label") + '</select></div><div class="form-group"><label>Estado</label><select class="input" id="report-status"><option value="">Todos</option><option>Activa</option><option>Promovida</option><option>Retirada</option></select></div></div>';
    else if (type === "files") target.innerHTML = '<div class="field-row"><div class="form-group"><label>Sección</label><select class="input" id="report-section"><option value="">Todas</option>' + App.formOptions(sections, "id", "label") + '</select></div><div class="form-group"><label>Estado del expediente</label><select class="input" id="report-status"><option value="">Todos</option><option value="Completo">Completo</option><option value="Incompleto">Incompleto</option></select></div></div>';
    else if (type === "inventory") target.innerHTML = '<div class="field-row three"><div class="form-group"><label>Categoría</label><select class="input" id="report-category"><option value="">Todas</option>' + App.formOptions(App.state.documentCategories, "id", "name") + '</select></div><div class="form-group"><label>Desde</label><input class="input" id="report-from" type="date"></div><div class="form-group"><label>Hasta</label><input class="input" id="report-to" type="date"></div></div>';
    else target.innerHTML = '<div class="field-row"><div class="form-group"><label>Solicitud</label><select class="input" id="report-request"><option value="">Todas las solicitudes</option>' + App.formOptions(App.state.deliveryRequests.filter(function (x) { return x.cycleId === cycleId; }), "id", "title") + '</select></div><div class="form-group"><label>Estado</label><select class="input" id="report-status"><option value="">Todos</option><option>Pendiente</option><option>Recibido</option><option>Aprobado</option><option>Corrección solicitada</option><option>Vencido</option></select></div></div>';
  }

  App.actions["generate-report"] = function () {
    var type = document.getElementById("report-type").value; var cycleId = App.state.settings.selectedCycleId; var headers = []; var rows = []; var title = "";
    if (type === "enrollments") {
      title = "Reporte de matrículas"; headers = ["Código", "Estudiante", "Sección", "Docente", "Estado"];
      var sectionId = document.getElementById("report-section").value; var status = document.getElementById("report-status").value;
      App.state.enrollments.filter(function (x) { return x.cycleId === cycleId && (!sectionId || x.sectionId === sectionId) && (!status || x.status === status); }).forEach(function (e) { var s = App.studentById(e.studentId); var sec = App.sectionById(e.sectionId); rows.push([s.code, s.firstNames + " " + s.lastNames, sec ? sec.label : "—", sec ? App.userName(sec.teacherId) : "—", e.status]); });
    } else if (type === "files") {
      title = "Estado de expedientes"; headers = ["Código", "Estudiante", "Sección", "Estado", "Documentos faltantes"];
      var fileSection = document.getElementById("report-section").value; var fileStatus = document.getElementById("report-status").value;
      App.state.enrollments.filter(function (x) { return x.cycleId === cycleId && (!fileSection || x.sectionId === fileSection); }).forEach(function (e) { var s = App.studentById(e.studentId); var sec = App.sectionById(e.sectionId); var state = App.studentFileStatus(s.id, cycleId); var label = state.complete ? "Completo" : "Incompleto"; if (!fileStatus || label === fileStatus) rows.push([s.code, s.firstNames + " " + s.lastNames, sec ? sec.label : "—", label, state.missing.map(function (x) { return x.name; }).join("; ") || "Ninguno"]); });
    } else if (type === "inventory") {
      title = "Inventario documental"; headers = ["Código", "Título", "Categoría", "Responsable", "Fecha", "Estado", "Archivo"];
      var cat = document.getElementById("report-category").value; var from = document.getElementById("report-from").value; var to = document.getElementById("report-to").value;
      App.state.repositoryDocuments.filter(function (d) { return d.cycleId === cycleId && (!cat || d.categoryId === cat) && (!from || d.documentDate >= from) && (!to || d.documentDate <= to); }).forEach(function (d) { rows.push([d.code, d.title, App.categoryName(d.categoryId), App.userName(d.responsibleId), d.documentDate, d.status, d.fileId ? "Disponible" : "Sin archivo"]); });
    } else {
      title = "Cumplimiento de entregas"; headers = ["Solicitud", "Docente", "Secciones", "Fecha límite", "Fecha entrega", "Estado", "Código"];
      var requestId = document.getElementById("report-request").value; var submissionStatus = document.getElementById("report-status").value;
      App.state.deliveryRequests.filter(function (r) { return r.cycleId === cycleId && (!requestId || r.id === requestId); }).forEach(function (r) { r.targetUserIds.forEach(function (teacherId) { var sub = App.state.submissions.find(function (s) { return s.requestId === r.id && s.teacherId === teacherId; }); var label = sub ? sub.status : (r.dueDate < App.todayIso() ? "Vencido" : "Pendiente"); if (!submissionStatus || label === submissionStatus) rows.push([r.title, App.userName(teacherId), App.teacherSections(teacherId, cycleId).map(function (s) { return s.label; }).join(" y "), r.dueDate, sub ? sub.submittedAt : "—", label, sub ? sub.code : "—"]); }); });
    }
    App.lastReport = { title: title, headers: headers, rows: rows, cycle: App.selectedCycle().year };
    var tableRows = rows.map(function (row) { return "<tr>" + row.map(function (cell) { return "<td>" + App.escape(cell) + "</td>"; }).join("") + "</tr>"; }).join("");
    document.getElementById("report-result").innerHTML = '<section class="report-preview"><div class="report-heading"><img src="assets/logo-escuela.png" alt="Logo"><div><h2>' + App.escape(title) + '</h2><p>EORM Orfelinda Osorio Lemus · Ciclo ' + App.selectedCycle().year + ' · Generado ' + App.formatDate(App.nowIso(), true) + '</p></div></div><p><strong>' + rows.length + '</strong> registros encontrados.</p><div class="table-wrap"><table><thead><tr>' + headers.map(function (h) { return "<th>" + App.escape(h) + "</th>"; }).join("") + '</tr></thead><tbody>' + (tableRows || '<tr><td colspan="' + headers.length + '">Sin resultados</td></tr>') + '</tbody></table></div><div class="page-actions no-print mt-20"><button class="btn btn-secondary" data-action="export-report-csv">Exportar CSV</button><button class="btn btn-primary" data-action="print-report">Imprimir / Guardar PDF</button></div></section>';
    App.audit("Generó reporte", "Reportes", title, rows.length + " registros");
  };

  App.actions["export-report-csv"] = function () {
    if (!App.lastReport) return;
    var escapeCsv = function (value) { return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"'; };

    var csv = "sep=;\r\n" +
      [App.lastReport.headers.map(escapeCsv).join(";")]
      .concat(
        App.lastReport.rows.map(function (row) {
          return row.map(escapeCsv).join(";");
        })
      )
      .join("\r\n");

      
    var contenido = "\ufeff" + csv;

    var archivo = new Blob(
      [contenido],
      { type: "text/csv;charset=utf-8" }
    );

    window.SGADStorage.downloadBlob(
      archivo,
      App.normalizeSearch(App.lastReport.title)
        .replace(/\s+/g, "-") +
        "-" + App.lastReport.cycle + ".csv"
    );

      App.audit("Exportó reporte", "Reportes", App.lastReport.title, "Formato CSV");
  };
  App.actions["print-report"] = function () { if (App.lastReport) { App.audit("Imprimió reporte", "Reportes", App.lastReport.title, "Impresión o guardado PDF"); window.print(); } };

  App.pages.trash = function () {
    var rows = App.state.trash.filter(function (item) { return item.originalDoc && item.originalDoc.cycleId === App.state.settings.selectedCycleId; }).map(function (item) { var doc = item.originalDoc || {}; return '<tr><td><div class="cell-title">' + App.escape(doc.title || doc.fileName || item.originalId) + '</div><div class="cell-sub">' + App.escape(doc.code || item.entityType) + '</div></td><td>' + App.escape(item.entityType === "repositoryDocument" ? "Repositorio" : "Expediente") + '</td><td>' + App.escape(App.userName(item.deletedBy)) + '</td><td>' + App.formatDate(item.deletedAt, true) + '</td><td><div class="table-actions"><button class="btn btn-soft btn-sm" data-action="preview-trash-file" data-id="' + item.id + '">Ver documento</button><button class="btn btn-secondary btn-sm" data-action="restore-trash" data-id="' + item.id + '">Restaurar</button><button class="btn btn-danger btn-sm" data-action="purge-trash" data-id="' + item.id + '">Eliminar</button></div></td></tr>'; }).join("");
    return '<div class="page">' + pageHead("Recuperación", "Papelera", "Consulte documentos eliminados, restáurelos o elimínelos definitivamente.") + '<div class="alert alert-warning mb-0"><span>⚠</span><div>La eliminación definitiva también borra los archivos y sus versiones almacenadas.</div></div><div class="table-card mt-20"><div class="table-wrap"><table><thead><tr><th>Registro</th><th>Origen</th><th>Eliminado por</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">' + App.empty("Papelera vacía", "No hay elementos eliminados.") + '</td></tr>') + '</tbody></table></div></div></div>';
  };

  App.actions["preview-trash-file"] = function (element) { var item = App.state.trash.find(function (x) { return x.id === element.dataset.id; }); if (item) return App.previewRecordFile(item.originalDoc, { collection: "trash", module: "Papelera" }); };
  App.actions["restore-trash"] = function (element) {
    var item = App.state.trash.find(function (x) { return x.id === element.dataset.id; }); if (!item) return;
    App.confirm("Restaurar documento", "El registro volverá a su módulo de origen.", function () { if (item.entityType === "repositoryDocument") App.state.repositoryDocuments.push(item.originalDoc); else App.state.studentDocuments.push(item.originalDoc); App.state.trash = App.state.trash.filter(function (x) { return x.id !== item.id; }); App.audit("Restauró documento", "Papelera", item.originalDoc.code || item.originalId, item.originalDoc.title || item.originalDoc.fileName); App.toast("Documento restaurado.", "success"); App.renderShell(); });
  };
  App.actions["purge-trash"] = function (element) {
    var item = App.state.trash.find(function (x) { return x.id === element.dataset.id; }); if (!item) return;
    App.openModal({ size: "sm", eyebrow: "Eliminación definitiva", title: "Esta acción no se puede deshacer", body: '<div class="alert alert-danger form-group"><span>⚠</span><div>Se eliminarán el registro, el archivo actual y todas sus versiones.</div></div><div class="form-group"><label>Escriba <strong>ELIMINAR</strong> para continuar</label><input class="input" id="delete-confirmation" autocomplete="off"></div>', footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn btn-danger" data-action="confirm-purge-trash" data-id="' + item.id + '">Eliminar definitivamente</button>' });
  };
  App.actions["confirm-purge-trash"] = function (element) {
    if (document.getElementById("delete-confirmation").value !== "ELIMINAR") { App.toast("Escriba ELIMINAR exactamente.", "error"); return; }
    var item = App.state.trash.find(function (x) { return x.id === element.dataset.id; }); var doc = item.originalDoc || {};
    var ids = [doc.fileId].concat((doc.versions || []).map(function (v) { return v.fileId; })).filter(Boolean);
    return Promise.all(ids.map(window.SGADStorage.deleteFile)).then(function () { App.state.trash = App.state.trash.filter(function (x) { return x.id !== item.id; }); App.audit("Eliminó definitivamente", "Papelera", doc.code || item.originalId, doc.title || doc.fileName); App.closeModal(); App.toast("Documento eliminado definitivamente.", "success"); App.renderShell(); });
  };

  App.pages.backups = function () {
    return '<div class="page">' + pageHead("Seguridad", "Copias de seguridad", "Exporte o restaure los datos y archivos locales del prototipo.") + '<section class="grid-2"><article class="card"><div class="list-icon">↓</div><h2 class="card-title mt-12">Crear copia de seguridad</h2><p class="muted">Descarga el estado, los metadatos y los archivos de IndexedDB en un paquete SGAD.</p><button class="btn btn-primary" data-action="create-backup">Crear y descargar respaldo</button></article><article class="card"><div class="list-icon">↑</div><h2 class="card-title mt-12">Restaurar copia</h2><p class="muted">La restauración validará el archivo antes de reemplazar la información actual.</p><input class="hidden" id="restore-backup-input" type="file" accept=".json,.sgad-backup.json"><button class="btn btn-secondary" data-action="choose-backup">Seleccionar respaldo</button></article></section><article class="card mt-20"><h2 class="card-title">Datos del almacenamiento local</h2><div class="detail-grid mt-12"><div class="detail-item"><label>Registros en bitácora</label><strong>' + App.state.audit.length + '</strong></div><div class="detail-item"><label>Documentos institucionales</label><strong>' + App.state.repositoryDocuments.length + '</strong></div><div class="detail-item"><label>Documentos de expedientes</label><strong>' + App.state.studentDocuments.length + '</strong></div><div class="detail-item"><label>Última actualización</label><strong>' + App.formatDate(App.state.lastUpdatedAt, true) + '</strong></div></div><div class="alert alert-danger mt-20"><span>⚠</span><div><strong>Restablecer demostración:</strong> elimina todos los cambios y archivos cargados en este navegador. <button class="link-button" data-action="reset-demo">Restablecer ahora</button></div></div></article></div>';
  };

  App.pageMounted.backups = function () {
    document.getElementById("restore-backup-input").addEventListener("change", function (event) { var file = event.target.files[0]; if (!file) return; var reader = new FileReader(); reader.onload = function () { try { var payload = JSON.parse(reader.result); window.SGADStorage.exportBackup(App.state).then(function (snapshot) { return window.SGADStorage.restoreBackup(payload).catch(function (error) { window.SGADStorage.restoreBackup(snapshot); throw error; }); }).then(function (state) { App.state = state; App.audit("Restauró copia de seguridad", "Copias de seguridad", file.name, "Restauración completada"); App.toast("Copia restaurada correctamente.", "success"); App.renderShell(); }).catch(function (error) { App.toast(error.message, "error"); }); } catch (error) { App.toast("El archivo de respaldo no contiene JSON válido.", "error"); } }; reader.readAsText(file); });
  };
  App.actions["choose-backup"] = function () { document.getElementById("restore-backup-input").click(); };
  App.actions["create-backup"] = function () {
    App.audit("Creó copia de seguridad", "Copias de seguridad", "SGAD-" + App.todayIso(), "Respaldo local con archivos");
    App.toast("Preparando copia de seguridad...", "");
    return window.SGADStorage.exportBackup(App.state).then(function (backup) { var blob = new Blob([JSON.stringify(backup)], { type: "application/json" }); var name = "SGAD-respaldo-" + App.todayIso() + ".sgad-backup.json"; window.SGADStorage.downloadBlob(blob, name); App.audit("Descargó copia de seguridad", "Copias de seguridad", name, window.SGADStorage.formatBytes(blob.size)); App.toast("Respaldo descargado.", "success"); });
  };
  App.actions["reset-demo"] = function () { App.confirm("Restablecer toda la demostración", "Se eliminarán de este navegador los registros y archivos agregados. Esta acción no se puede deshacer.", function () { return window.SGADStorage.resetState().then(function (state) { App.state = state; App.session = null; App.renderLogin(); App.toast("Demostración restablecida.", "success"); }); }, true); };

  App.pages.audit = function () {
    var rows = auditRows(App.state.audit);
    return '<div class="page">' + pageHead("Seguridad", "Bitácora de actividad", "Consulte quién realizó cada acción importante en el sistema.") + '<div class="toolbar four"><input class="input" id="audit-search" placeholder="Buscar acción, registro o detalles..."><select class="input" id="audit-user"><option value="">Todos los usuarios</option>' + App.formOptions(App.state.users, "id", "name") + '</select><input class="input" id="audit-from" type="date"><input class="input" id="audit-to" type="date"></div><div class="table-card"><div class="table-wrap"><table><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Registro</th><th>Detalles</th></tr></thead><tbody id="audit-rows">' + rows + '</tbody></table></div></div></div>';
  };
  function auditRows(items) { return items.map(function (item) { return '<tr><td class="nowrap">' + App.formatDate(item.date, true) + '</td><td><strong>' + App.escape(App.userName(item.userId)) + '</strong><div class="cell-sub">' + App.escape(item.role) + '</div></td><td>' + App.escape(item.action) + '</td><td>' + App.escape(item.module) + '</td><td>' + App.escape(item.record) + '</td><td>' + App.escape(item.details) + '</td></tr>'; }).join("") || '<tr><td colspan="6">' + App.empty("Sin actividad", "Todavía no hay registros en la bitácora.") + '</td></tr>'; }
  App.pageMounted.audit = function () { ["audit-search", "audit-user", "audit-from", "audit-to"].forEach(function (id) { document.getElementById(id).addEventListener("input", function () { var search = App.normalizeSearch(document.getElementById("audit-search").value); var user = document.getElementById("audit-user").value; var from = document.getElementById("audit-from").value; var to = document.getElementById("audit-to").value; var rows = App.state.audit.filter(function (item) { var haystack = App.normalizeSearch(item.action + " " + item.module + " " + item.record + " " + item.details + " " + App.userName(item.userId)); var day = new Date(item.date).toLocaleDateString("sv-SE", {
  timeZone: "America/Guatemala",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}); return (!search || haystack.indexOf(search) >= 0) && (!user || item.userId === user) && (!from || day >= from) && (!to || day <= to); }); document.getElementById("audit-rows").innerHTML = auditRows(rows); }); }); };

  
  // =====================================================
  // SGAD - VISTA INDEPENDIENTE DE ESTUDIANTES POR SECCIÓN
  // =====================================================

  var directorSectionViewId = null;

  function directorSectionEnrollments(section) {
    return App.state.enrollments.filter(function (enrollment) {
      return enrollment.cycleId === section.cycleId &&
        enrollment.sectionId === section.id &&
        enrollment.status !== "Retirada";
    });
  }

  function directorSectionStudentRows(enrollments) {
    return enrollments.map(function (enrollment) {
      var student = App.studentById(enrollment.studentId);

      if (!student) return "";

      var status = App.studentFileStatus(
        student.id,
        enrollment.cycleId
      );

      return '<tr>' +
        '<td>' +
          '<div class="cell-title">' +
            App.escape(
              student.firstNames + " " + student.lastNames
            ) +
          '</div>' +
          '<div class="cell-sub">Encargado: ' +
            App.escape(student.guardian || "No registrado") +
          '</div>' +
        '</td>' +
        '<td>' +
          App.escape(student.code) +
          '<div class="cell-sub">' +
            App.escape(student.cui || "—") +
          '</div>' +
        '</td>' +
        '<td>' +
          App.statusBadge(
            status.complete ? "Completo" : "Incompleto"
          ) +
          '<div class="cell-sub">' +
            status.delivered + "/" + status.total +
            ' documentos</div>' +
        '</td>' +
        '<td>' +
          '<button class="btn btn-soft btn-sm" ' +
            'data-action="view-student-file" ' +
            'data-id="' + App.escape(student.id) + '">' +
            'Ver expediente' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join("");
  }

  // Pantalla principal: solo grados y secciones.
  App.pages.enrollments = function () {
    var cycle = App.selectedCycle();

    if (!cycle) {
      return '<div class="page">' +
        App.empty(
          "Sin ciclo escolar",
          "No se encontró un ciclo seleccionado."
        ) +
      '</div>';
    }

    if (directorSectionViewId) {
      var selectedSection = App.state.sections.find(
        function (section) {
          return section.id === directorSectionViewId &&
            section.cycleId === cycle.id &&
            section.active;
        }
      );

      if (selectedSection) {
        return renderDirectorSectionStudents(selectedSection);
      }

      directorSectionViewId = null;
    }

    var sections = App.state.sections.filter(
      function (section) {
        return section.cycleId === cycle.id &&
          section.active;
      }
    ).sort(function (a, b) {
      return a.grade - b.grade ||
        a.label.localeCompare(b.label);
    });

    var cards = sections.map(function (section) {
      var enrollments = directorSectionEnrollments(section);

      var incomplete = enrollments.filter(
        function (enrollment) {
          return !App.studentFileStatus(
            enrollment.studentId,
            cycle.id
          ).complete;
        }
      ).length;

      // Un ID duplicado no permite identificar
      // con seguridad una sección concreta.
      var repeatedId = sections.some(function (other) {
        return other !== section &&
          other.id === section.id;
      });

      return '<article class="section-card">' +
        '<div class="section-top">' +
          '<div>' +
            '<p class="eyebrow">Grado y sección</p>' +
            '<h3>' + App.escape(section.label) + '</h3>' +
          '</div>' +
          '<span class="section-count">' +
            enrollments.length +
          '</span>' +
        '</div>' +

        '<p class="muted">Docente responsable: ' +
          '<strong>' +
            App.escape(
              section.teacherId
                ? App.userName(section.teacherId)
                : "Sin asignar"
            ) +
          '</strong>' +
        '</p>' +

        '<div class="section-foot">' +
          (repeatedId
            ? '<span class="badge badge-danger">' +
                'ID duplicado' +
              '</span>'
            : incomplete
              ? '<span class="badge badge-warning">' +
                  incomplete + ' incompletos' +
                '</span>'
              : '<span class="badge badge-success">' +
                  'Expedientes al día' +
                '</span>') +

          '<button class="btn btn-soft btn-sm" ' +
            'data-action="filter-section" ' +
            'data-id="' + App.escape(section.id) + '"' +
            (repeatedId ? ' disabled' : '') + '>' +
            'Ver estudiantes' +
          '</button>' +
        '</div>' +
      '</article>';
    }).join("");

    var actions = App.isSelectedCycleWritable()
      ? '<button class="btn btn-primary" ' +
          'data-action="open-enrollment-form">' +
          'Nueva matrícula</button>'
      : "";

    return '<div class="page">' +
      '<div class="page-head">' +
        '<div>' +
          '<p class="eyebrow">Gestión escolar</p>' +
          '<h1>Expedientes</h1>' +
          '<p>Seleccione el grado y sección para ' +
            'consultar sus estudiantes. Ciclo ' +
            App.escape(cycle.year) + '.</p>' +
        '</div>' +
        '<div class="page-actions">' + actions + '</div>' +
      '</div>' +

      '<section class="grid-3">' +
        (cards || App.empty(
          "Sin secciones",
          "Este ciclo todavía no tiene secciones."
        )) +
      '</section>' +
    '</div>';
  };

  // Pantalla secundaria: alumnos de una sola sección.
  function renderDirectorSectionStudents(section) {
    var cycle = App.selectedCycle();
    var enrollments = directorSectionEnrollments(section);

    var rows = directorSectionStudentRows(enrollments);

    return '<div class="page">' +
      '<div class="page-head">' +
        '<div>' +
          '<p class="eyebrow">Matrículas / ' +
            App.escape(section.label) +
          '</p>' +
          '<h1>Estudiantes de ' +
            App.escape(section.label) +
          '</h1>' +
          '<p>Ciclo escolar ' +
            App.escape(cycle.year) +
            '</p>' +
        '</div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-secondary" ' +
            'data-action="back-to-sections">' +
            '← Volver a las secciones' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<article class="card mb-0">' +
        '<div class="detail-grid">' +
          '<div class="detail-item">' +
            '<label>Grado y sección</label>' +
            '<strong>' +
              App.escape(section.label) +
            '</strong>' +
          '</div>' +
          '<div class="detail-item">' +
            '<label>Docente responsable</label>' +
            '<strong>' +
              App.escape(
                section.teacherId
                  ? App.userName(section.teacherId)
                  : "Sin asignar"
              ) +
            '</strong>' +
          '</div>' +
          '<div class="detail-item">' +
            '<label>Estudiantes matriculados</label>' +
            '<strong>' + enrollments.length + '</strong>' +
          '</div>' +
          '<div class="detail-item">' +
            '<label>Ciclo escolar</label>' +
            '<strong>' +
              App.escape(cycle.year) +
            '</strong>' +
          '</div>' +
        '</div>' +
      '</article>' +

      '<div class="toolbar mt-20">' +
        '<input class="input" ' +
          'id="director-section-search" ' +
          'placeholder="Buscar estudiante, CUI o código...">' +
        '<select class="input" ' +
          'id="director-section-status">' +
          '<option value="">Todos los expedientes</option>' +
          '<option value="complete">Completos</option>' +
          '<option value="incomplete">Incompletos</option>' +
        '</select>' +
      '</div>' +

      '<div class="table-card">' +
        '<div class="table-wrap">' +
          '<table>' +
            '<thead><tr>' +
              '<th>Estudiante</th>' +
              '<th>Código / CUI</th>' +
              '<th>Expediente</th>' +
              '<th>Acción</th>' +
            '</tr></thead>' +
            '<tbody id="director-section-rows">' +
              (rows || '<tr><td colspan="4">' +
                App.empty(
                  "Sin estudiantes",
                  "No hay matrículas en esta sección."
                ) +
              '</td></tr>') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function filterDirectorSectionStudents() {
    var section = App.state.sections.find(function (item) {
      return item.id === directorSectionViewId &&
        item.cycleId === App.state.settings.selectedCycleId;
    });

    if (!section) return;

    var searchElement = document.getElementById(
      "director-section-search"
    );

    var statusElement = document.getElementById(
      "director-section-status"
    );

    var target = document.getElementById(
      "director-section-rows"
    );

    if (!searchElement || !statusElement || !target) {
      return;
    }

    var search = App.normalizeSearch(
      searchElement.value
    );

    var statusFilter = statusElement.value;

    var filtered = directorSectionEnrollments(section)
      .filter(function (enrollment) {
        var student = App.studentById(
          enrollment.studentId
        );

        if (!student) return false;

        var haystack = App.normalizeSearch(
          student.firstNames + " " +
          student.lastNames + " " +
          student.cui + " " +
          student.code
        );

        var fileStatus = App.studentFileStatus(
          student.id,
          section.cycleId
        );

        var matchesSearch =
          !search || haystack.indexOf(search) >= 0;

        var matchesStatus =
          !statusFilter ||
          (statusFilter === "complete"
            ? fileStatus.complete
            : !fileStatus.complete);

        return matchesSearch && matchesStatus;
      });

    target.innerHTML = filtered.length
      ? directorSectionStudentRows(filtered)
      : '<tr><td colspan="4">' +
          App.empty(
            "Sin coincidencias",
            "No se encontraron estudiantes."
          ) +
        '</td></tr>';
  }

  // Botón: Ver estudiantes.
  App.actions["filter-section"] = function (element) {
    var cycleId = App.state.settings.selectedCycleId;
    var sectionId = element.dataset.id;

    var matches = App.state.sections.filter(
      function (section) {
        return section.id === sectionId &&
          section.cycleId === cycleId &&
          section.active;
      }
    );

    if (matches.length !== 1) {
      App.toast(
        "Esta sección tiene un identificador duplicado " +
        "o no existe. Primero debe corregirse.",
        "error"
      );
      return;
    }

    directorSectionViewId = sectionId;

    App.renderView();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // Botón: Volver a grados y secciones.
  App.actions["back-to-sections"] = function () {
    directorSectionViewId = null;
    App.renderView();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // Activa buscador y filtro solo en la vista secundaria.
  App.pageMounted.enrollments = function () {
    var search = document.getElementById(
      "director-section-search"
    );

    var status = document.getElementById(
      "director-section-status"
    );

    if (search) {
      search.addEventListener(
        "input",
        filterDirectorSectionStudents
      );
    }

    if (status) {
      status.addEventListener(
        "change",
        filterDirectorSectionStudents
      );
    }
  };


  // =====================================================
  // SGAD - ELIMINAR CICLOS ESCOLARES VACÍOS
  // =====================================================

  App.actions["delete-empty-cycle"] = function (element) {
    var cycleId = element.dataset.id;
    var cycle = App.cycleById(cycleId);

    if (!App.currentUser() ||
        App.currentUser().role !== "directora") {
      App.toast("Acción exclusiva de Dirección.", "error");
      return;
    }

    if (!cycle) {
      App.toast("No se encontró el ciclo escolar.", "error");
      return;
    }

    var current = App.activeCycle();

    if (current && current.id === cycleId) {
      App.toast(
        "No puede eliminar el ciclo vigente.",
        "warning"
      );
      return;
    }

    var hasEnrollments = App.state.enrollments.some(
      function (item) {
        return item.cycleId === cycleId;
      }
    );

    var hasDocuments =
      App.state.studentDocuments.some(function (item) {
        return item.cycleId === cycleId;
      }) ||
      App.state.repositoryDocuments.some(function (item) {
        return item.cycleId === cycleId;
      });

    var requests = App.state.deliveryRequests.filter(
      function (item) {
        return item.cycleId === cycleId;
      }
    );

    var requestIds = new Set(
      requests.map(function (item) {
        return item.id;
      })
    );

    var hasSubmissions = App.state.submissions.some(
      function (item) {
        return requestIds.has(item.requestId);
      }
    );

    var hasTrash = App.state.trash.some(function (item) {
      return item.originalDoc &&
        item.originalDoc.cycleId === cycleId;
    });

    if (
      hasEnrollments ||
      hasDocuments ||
      requests.length ||
      hasSubmissions ||
      hasTrash
    ) {
      App.toast(
        "Este ciclo contiene información escolar. " +
        "No puede eliminarse; consérvelo como histórico.",
        "warning"
      );
      return;
    }

    App.confirm(
      "Eliminar ciclo " + cycle.year,
      "Se eliminará este ciclo y sus secciones vacías. " +
      "Esta acción no se puede deshacer.",
      function () {
        // Revalidar antes de ejecutar la eliminación.
        if (
          App.activeCycle().id === cycleId ||
          App.state.enrollments.some(function (x) {
            return x.cycleId === cycleId;
          }) ||
          App.state.studentDocuments.some(function (x) {
            return x.cycleId === cycleId;
          }) ||
          App.state.repositoryDocuments.some(function (x) {
            return x.cycleId === cycleId;
          }) ||
          App.state.deliveryRequests.some(function (x) {
            return x.cycleId === cycleId;
          }) ||
          App.state.trash.some(function (x) {
            return x.originalDoc &&
              x.originalDoc.cycleId === cycleId;
          })
        ) {
          throw new Error(
            "El ciclo ya no cumple las condiciones de eliminación."
          );
        }

        var next = window.SGADStorage.clone(App.state);

        next.cycles = next.cycles.filter(function (x) {
          return x.id !== cycleId;
        });

        next.sections = next.sections.filter(function (x) {
          return x.cycleId !== cycleId;
        });

        if (next.settings.selectedCycleId === cycleId) {
          next.settings.selectedCycleId =
            next.settings.activeCycleId;
        }

        next.audit.unshift({
          id: window.SGADStorage.createId("aud"),
          date: App.nowIso(),
          userId: App.currentUser().id,
          role: "Directora",
          action: "Eliminó ciclo vacío",
          module: "Ciclos",
          record: String(cycle.year),
          details: "Eliminación de ciclo sin registros escolares"
        });

        App.state = window.SGADStorage.saveState(next);

        App.toast(
          "Ciclo " + cycle.year + " eliminado correctamente.",
          "success"
        );

        App.renderShell();
      },
      true
    );
  };


  // =====================================================
  // SGAD - CERRAR Y REABRIR SOLICITUDES DOCENTES
  // =====================================================

  // Actualizar la pantalla de solicitudes.
  App.pages.requests = function () {
    var cycleId = App.state.settings.selectedCycleId;
    var writable = App.isSelectedCycleWritable();

    var requests = App.state.deliveryRequests
      .filter(function (request) {
        return request.cycleId === cycleId;
      })
      .sort(function (a, b) {
        return String(b.createdAt).localeCompare(
          String(a.createdAt)
        );
      });

    var cards = requests.map(function (request) {
      var targets = request.targetUserIds || [];

      var delivered = targets.filter(function (teacherId) {
        return App.state.submissions.some(function (submission) {
          return submission.requestId === request.id &&
            submission.teacherId === teacherId;
        });
      }).length;

      var percent = targets.length
        ? Math.round(delivered * 100 / targets.length)
        : 0;

      var buttons =
        '<button class="btn btn-soft btn-sm" ' +
        'data-action="request-compliance" data-id="' +
        App.escape(request.id) +
        '">Ver cumplimiento</button>';

      if (writable && request.status === "Vigente") {
        buttons +=
          '<button class="btn btn-secondary btn-sm" ' +
          'data-action="close-request" data-id="' +
          App.escape(request.id) +
          '">Cerrar</button>';
      }

      if (writable && request.status === "Cerrada") {
        buttons +=
          '<button class="btn btn-primary btn-sm" ' +
          'data-action="reopen-request" data-id="' +
          App.escape(request.id) +
          '">Reabrir</button>';
      }

      return '<article class="card">' +
        '<div class="card-head">' +
          '<div>' +
            '<h2 class="card-title">' +
              App.escape(request.title) +
            '</h2>' +
            '<p class="card-subtitle">' +
              'Vence ' + App.formatDate(request.dueDate) +
              ' · ' +
              App.escape(
                (request.allowedFormats || []).join(", ")
              ) +
            '</p>' +
          '</div>' +
          App.statusBadge(request.status) +
        '</div>' +

        '<p>' + App.escape(request.description) + '</p>' +

        '<div class="progress">' +
          '<span style="width:' + percent + '%"></span>' +
        '</div>' +

        '<div class="section-foot">' +
          '<span><strong>' +
            delivered + '/' + targets.length +
          '</strong> docentes entregaron</span>' +

          '<div class="table-actions">' +
            buttons +
          '</div>' +
        '</div>' +
      '</article>';
    }).join("");

    var actions = writable
      ? '<button class="btn btn-primary" ' +
        'data-action="open-request-form">' +
        'Crear solicitud</button>'
      : "";

    return '<div class="page">' +
      pageHead(
        "Gestión documental",
        "Solicitudes de entrega",
        "Solicite documentos y supervise el cumplimiento de cada docente.",
        actions
      ) +
      '<section class="grid-2">' +
      (cards || App.empty(
        "Sin solicitudes",
        "Todavía no se han creado solicitudes para este ciclo."
      )) +
      '</section>' +
    '</div>';
  };

  // Validar que Dirección pueda modificar la solicitud.
  function canManageDeliveryRequest(request) {
    var user = App.currentUser();

    return !!(
      user &&
      user.role === "directora" &&
      request &&
      request.cycleId === App.state.settings.selectedCycleId &&
      App.isSelectedCycleWritable()
    );
  }

  // Cerrar una solicitud.
  App.actions["close-request"] = function (element) {
    var request = App.state.deliveryRequests.find(
      function (item) {
        return item.id === element.dataset.id;
      }
    );

    if (!canManageDeliveryRequest(request) ||
        request.status !== "Vigente") {
      App.toast(
        "Esta solicitud no puede cerrarse.",
        "warning"
      );
      return;
    }

    App.confirm(
      "Cerrar solicitud",
      "Los docentes ya no podrán realizar nuevas entregas " +
      "ni enviar correcciones. Los documentos existentes " +
      "se conservarán.",
      function () {
        if (!canManageDeliveryRequest(request) ||
            request.status !== "Vigente") {
          App.toast(
            "La solicitud ya no puede modificarse.",
            "warning"
          );
          return;
        }

        var previousStatus = request.status;

        try {
          request.status = "Cerrada";

          App.audit(
            "Cerró solicitud",
            "Solicitudes",
            request.id,
            request.title
          );

          App.toast(
            "Solicitud cerrada correctamente.",
            "success"
          );

          App.renderShell();
        } catch (error) {
          request.status = previousStatus;
          App.toast(error.message, "error");
        }
      }
    );
  };

  // Mostrar formulario para reabrir una solicitud.
  App.actions["reopen-request"] = function (element) {
    var request = App.state.deliveryRequests.find(
      function (item) {
        return item.id === element.dataset.id;
      }
    );

    if (!canManageDeliveryRequest(request) ||
        request.status !== "Cerrada") {
      App.toast(
        "Esta solicitud no puede reabrirse.",
        "warning"
      );
      return;
    }

    var today = App.todayIso();
    var suggestedDate = request.dueDate >= today
      ? request.dueDate
      : today;

    App.openModal({
      size: "sm",
      eyebrow: "Gestión de solicitudes",
      title: "Reabrir solicitud",

      body:
        '<div class="alert alert-info form-group">' +
          '<span>i</span>' +
          '<div>' +
            'Se habilitarán nuevamente las entregas ' +
            'pendientes y las correcciones solicitadas. ' +
            'Los documentos anteriores se conservarán.' +
          '</div>' +
        '</div>' +

        '<form id="reopen-request-form">' +
          '<div class="form-group">' +
            '<label>Solicitud</label>' +
            '<strong>' + App.escape(request.title) +
            '</strong>' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="required">' +
              'Nueva fecha límite' +
            '</label>' +
            '<input class="input" type="date" ' +
              'name="dueDate" ' +
              'min="' + today + '" ' +
              'value="' + suggestedDate + '" required>' +
          '</div>' +
        '</form>',

      footer:
        '<button class="btn btn-secondary" ' +
        'data-action="close-modal">Cancelar</button>' +
        '<button class="btn btn-primary" ' +
        'data-action="save-reopened-request" data-id="' +
        App.escape(request.id) +
        '">Confirmar reapertura</button>'
    });
  };

  // Guardar reapertura y nueva fecha límite.
  App.actions["save-reopened-request"] = function (element) {
    var form = document.getElementById(
      "reopen-request-form"
    );

    if (!form || !form.reportValidity()) return;

    var request = App.state.deliveryRequests.find(
      function (item) {
        return item.id === element.dataset.id;
      }
    );

    if (!canManageDeliveryRequest(request) ||
        request.status !== "Cerrada") {
      App.toast(
        "No se puede modificar esta solicitud.",
        "warning"
      );
      return;
    }

    var data = new FormData(form);
    var dueDate = String(data.get("dueDate") || "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
        dueDate < App.todayIso()) {
      App.toast(
        "Seleccione una fecha válida desde hoy en adelante.",
        "error"
      );
      return;
    }

    var previousStatus = request.status;
    var previousDueDate = request.dueDate;

    try {
      request.status = "Vigente";
      request.dueDate = dueDate;

      App.audit(
        "Reabrió solicitud",
        "Solicitudes",
        request.id,
        request.title +
          " · Nueva fecha límite: " + dueDate
      );

      App.closeModal();

      App.toast(
        "Solicitud reabierta correctamente.",
        "success"
      );

      App.renderShell();

    } catch (error) {
      request.status = previousStatus;
      request.dueDate = previousDueDate;

      App.toast(
        error.message || "No se pudo reabrir la solicitud.",
        "error"
      );
    }
  };



  // SGAD-CONTROLES-CICLO-HISTORICO-V1

  (function () {

    // PANEL GENERAL
    var dashboardAnterior = App.pages.dashboard;

    App.pages.dashboard = function () {
      var html = dashboardAnterior();

      if (!App.isSelectedCycleWritable()) {
        html = html.replace(
          /<button[^>]*data-action="open-upload-document"[^>]*>Subir documento<\/button>/g,
          ""
        );

        html = html.replace(
          /<button[^>]*data-action="open-request-form"[^>]*>Crear solicitud<\/button>/g,
          ""
        );
      }

      return html;
    };


    // USUARIOS Y PERMISOS
    var usuariosAnterior = App.pages.users;

    App.pages.users = function () {
      var html = usuariosAnterior();

      if (!App.isSelectedCycleWritable()) {

        html = html.replace(
          /<button[^>]*data-action="manage-user"[^>]*>Crear usuario<\/button>/g,
          ""
        );

        html = html.replace(
          /<button[^>]*data-action="manage-user"[^>]*>Administrar<\/button>/g,
          '<span class="muted">Solo consulta</span>'
        );

        html = html.replace(
          '<div class="table-card">',
          '<div class="alert alert-info mb-20">' +
          '<span>i</span><div>' +
          'Está consultando un ciclo histórico. ' +
          'Seleccione el ciclo activo para administrar usuarios y permisos.' +
          '</div></div><div class="table-card">'
        );
      }

      return html;
    };


    // BLOQUEAR APERTURA DE FORMULARIOS
    var administrarAnterior = App.actions["manage-user"];

    App.actions["manage-user"] = function (element) {

      if (!App.isSelectedCycleWritable()) {
        App.toast(
          "Seleccione el ciclo activo para administrar usuarios.",
          "warning"
        );
        return;
      }

      return administrarAnterior(element);
    };


    // BLOQUEAR GUARDADO EN CICLOS HISTÓRICOS
    var guardarAnterior = App.actions["save-user"];

    App.actions["save-user"] = function (element) {

      if (!App.isSelectedCycleWritable()) {
        App.toast(
          "No puede modificar usuarios desde un ciclo histórico.",
          "warning"
        );
        return;
      }

      return guardarAnterior(element);
    };


    // ELIMINAR CICLO VACÍO: SOLO MOSTRAR SI NO HAY DATOS
    var ciclosAnterior = App.pages.cycles;

    App.pages.cycles = function () {
      var html = ciclosAnterior();
      var id = App.selectedCycle().id;

      var tieneDatos =
        App.state.enrollments.some(x => x.cycleId === id) ||
        App.state.studentDocuments.some(x => x.cycleId === id) ||
        App.state.repositoryDocuments.some(x => x.cycleId === id) ||
        App.state.deliveryRequests.some(x => x.cycleId === id) ||
        App.state.trash.some(x =>
          x.originalDoc && x.originalDoc.cycleId === id
        );

      if (tieneDatos) {
        html = html.replace(
          /<button[^>]*data-action="delete-empty-cycle"[^>]*>Eliminar ciclo vacío<\/button>/g,
          ""
        );
      }

      return html;
    };

  })();


  // SGAD-REPOSITORIO-HISTORICO-V1

  (function () {

    function cicloEditable() {
      return App.isSelectedCycleWritable();
    }

    function advertir() {
      App.toast(
        "Este ciclo es histórico y está disponible únicamente para consulta.",
        "warning"
      );
    }

    // OCULTAR BOTONES EN EL REPOSITORIO HISTÓRICO

    var repositorioOriginal = App.pages.repository;

    App.pages.repository = function () {
      var html = repositorioOriginal.apply(this, arguments);

      if (!cicloEditable()) {
        html = html.replace(
          /<button\b[^>]*data-action=["'](?:manage-categories|open-upload-document)["'][^>]*>[\s\S]*?<\/button>/gi,
          ""
        );
      }

      return html;
    };

    // PROTEGER LAS ACCIONES DEL REPOSITORIO

    [
      "open-upload-document",
      "save-upload-document",
      "manage-categories",
      "add-category",
      "toggle-category"
    ].forEach(function (nombre) {

      var accionOriginal = App.actions[nombre];

      App.actions[nombre] = function () {

        if (!cicloEditable()) {
          advertir();
          return;
        }

        return accionOriginal.apply(this, arguments);
      };

    });

  })();


  // SGAD-PAPELERA-POR-CICLO-V1

  (function () {

    function cicloSeleccionado() {
      return App.state.settings.selectedCycleId;
    }

    function elementoPermitido(element) {
      var id = element && element.dataset
        ? element.dataset.id
        : null;

      var item = App.state.trash.find(function (x) {
        return x.id === id;
      });

      if (!item || !item.originalDoc ||
          item.originalDoc.cycleId !== cicloSeleccionado()) {
        App.toast(
          "El documento no pertenece al ciclo seleccionado.",
          "warning"
        );
        return false;
      }

      return true;
    }

    // Ocultar las acciones de modificación en históricos
    var paginaAnterior = App.pages.trash;

    App.pages.trash = function () {
      var html = paginaAnterior.apply(this, arguments);

      if (!App.isSelectedCycleWritable()) {
        html = html.replace(
          /<button\b[^>]*data-action=["'](?:restore-trash|purge-trash)["'][^>]*>[\s\S]*?<\/button>/gi,
          ""
        );

        html = html.replace(
          "Consulte documentos eliminados, restáurelos o elimínelos definitivamente.",
          "Consulte los documentos eliminados del ciclo histórico."
        );
      }

      return html;
    };

    // Proteger la consulta, restauración y eliminación
    [
      "preview-trash-file",
      "restore-trash",
      "purge-trash",
      "confirm-purge-trash"
    ].forEach(function (nombre) {

      var originalAccion = App.actions[nombre];

      App.actions[nombre] = function (element) {

        if (!elementoPermitido(element)) {
          return;
        }

        if (nombre !== "preview-trash-file" &&
            !App.isSelectedCycleWritable()) {
          App.toast(
            "No puede modificar documentos de un ciclo histórico.",
            "warning"
          );
          return;
        }

        return originalAccion.apply(this, arguments);
      };

    });

  })();





// =============================================
// SGAD - MEJORAS EN FILTROS DE BITÁCORA
// =============================================

(function () {
  "use strict";

  // Guardamos la función original
  var montajeOriginal = App.pageMounted.audit;

  App.pageMounted.audit = function () {

    // Conservamos los filtros existentes
    if (typeof montajeOriginal === "function") {
      montajeOriginal();
    }

    var desde = document.getElementById("audit-from");
    var hasta = document.getElementById("audit-to");
    var busqueda = document.getElementById("audit-search");
    var usuario = document.getElementById("audit-user");
    var tabla = document.getElementById("audit-rows");

    if (!desde || !hasta || !tabla) return;

    function actualizarBitacora() {
      var inicio = desde.value;
      var fin = hasta.value;

      // Evitar un rango de fechas incorrecto
      if (inicio && fin && inicio > fin) {
        tabla.innerHTML =
          '<tr><td colspan="6">' +
          App.empty(
            "Rango de fechas incorrecto",
            "La fecha inicial no puede ser posterior a la fecha final."
          ) +
          "</td></tr>";
        return;
      }

      // El filtrado original ya se ejecutó mediante sus eventos.
      // Aquí mejoramos el mensaje si no se encontraron registros.
      var tieneRegistros = tabla.querySelectorAll("tr").length > 0;
      var esVacio =
        !tieneRegistros ||
        tabla.textContent.includes("Todavía no hay registros en la bitácora.");

      if (esVacio && App.state.audit.length > 0) {
        tabla.innerHTML =
          '<tr><td colspan="6">' +
          App.empty(
            "Sin resultados",
            "No se encontraron actividades con los filtros seleccionados."
          ) +
          "</td></tr>";
      }
    }

    // Estos eventos se registran después de los originales
    [desde, hasta, busqueda, usuario].forEach(function (campo) {
      if (campo) {
        campo.addEventListener("input", actualizarBitacora);
      }
    });

    actualizarBitacora();
  };
})();


})();
