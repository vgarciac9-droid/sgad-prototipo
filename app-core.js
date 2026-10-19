(function () {
  "use strict";

  var App = {
    state: null,
    session: null,
    currentView: "dashboard",
    pages: {},
    actions: {},
    activeObjectUrls: [],
    activePreviewRecord: null,
    lastReport: null
  };

  var CREDENTIALS = [
    { email: "directora@sgad.demo", password: "Demo2026!", userId: "usr-dir" },
    { email: "carlos@sgad.demo", password: "Docente2026!", userId: "usr-car" },
    { email: "ana@sgad.demo", password: "Docente2026!", userId: "usr-ana" },
    { email: "mario@sgad.demo", password: "Docente2026!", userId: "usr-mar" },
    { email: "julia@sgad.demo", password: "Docente2026!", userId: "usr-jul" }
  ];

  var DIRECTOR_NAV = [
    { section: "Principal" },
    { id: "dashboard", label: "Panel general", icon: "▦" },
    { id: "reviews", label: "Bandeja de revisión", icon: "✓", badge: "reviews" },
    { id: "repository", label: "Repositorio institucional", icon: "▤" },
    { section: "Gestión escolar" },
    { id: "enrollments", label: "Expedientes", icon: "◎", badge: "students" },
    { id: "cycles", label: "Ciclo escolar", icon: "▱" },
    { id: "requests", label: "Solicitudes de entrega", icon: "◷", badge: "requests" },
    { section: "Administración" },
    { id: "users", label: "Usuarios y permisos", icon: "♟" },
    { id: "reports", label: "Reportes", icon: "▥" },
    { id: "trash", label: "Papelera", icon: "♻", badge: "trash" },
    { section: "Seguridad" },
    { id: "backups", label: "Copias de seguridad", icon: "◫" },
    { id: "audit", label: "Bitácora de actividad", icon: "☷" }
  ];

  var TEACHER_NAV = [
    { section: "Mi espacio" },
    { id: "teacher-dashboard", label: "Mi panel", icon: "▦" },
    { id: "teacher-students", label: "Mis estudiantes", icon: "◎" },
    { id: "teacher-requests", label: "Entregas solicitadas", icon: "◷", badge: "teacherRequests" },
    { id: "teacher-documents", label: "Mis documentos", icon: "▤" },
    { section: "Seguimiento" },
    { id: "teacher-corrections", label: "Correcciones", icon: "↻", badge: "corrections" },
    { id: "teacher-receipts", label: "Mis comprobantes", icon: "▧" }
  ];

  App.escape = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  App.normalizeSearch = function (value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  App.formatDate = function (value, withTime) {
    if (!value) return "—";
    var date = new Date(value.length === 10 ? value + "T12:00:00" : value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-GT", withTime ? {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    } : { day: "2-digit", month: "short", year: "numeric" }).format(date);
  };

  App.todayIso = function () { return new Date().toISOString().slice(0, 10); };
  App.nowIso = function () { return new Date().toISOString(); };

  App.currentUser = function () {
    return App.session && App.state ? App.state.users.find(function (item) { return item.id === App.session.userId; }) : null;
  };

  App.userById = function (id) { return App.state.users.find(function (item) { return item.id === id; }); };
  App.cycleById = function (id) { return App.state.cycles.find(function (item) { return item.id === id; }); };
  App.sectionById = function (id) { return App.state.sections.find(function (item) { return item.id === id; }); };
  App.studentById = function (id) { return App.state.studentIdentities.find(function (item) { return item.id === id; }); };
  App.categoryById = function (id) { return App.state.documentCategories.find(function (item) { return item.id === id; }); };
  App.selectedCycle = function () { return App.cycleById(App.state.settings.selectedCycleId) || App.state.cycles[0]; };
  App.activeCycle = function () { return App.cycleById(App.state.settings.activeCycleId) || App.state.cycles[0]; };
  App.isSelectedCycleWritable = function () { return App.selectedCycle() && App.selectedCycle().status === "Activo"; };

  App.userName = function (id) {
    var user = App.userById(id);
    return user ? user.name : "Usuario no disponible";
  };

  App.categoryName = function (id) {
    var category = App.categoryById(id);
    return category ? category.name : "Sin categoría";
  };

  App.teacherSections = function (teacherId, cycleId) {
    return App.state.sections.filter(function (item) {
      return item.cycleId === (cycleId || App.state.settings.selectedCycleId) && item.teacherId === teacherId && item.active;
    });
  };

  App.studentEnrollment = function (studentId, cycleId) {
    return App.state.enrollments.find(function (item) {
      return item.studentId === studentId && item.cycleId === (cycleId || App.state.settings.selectedCycleId);
    });
  };

  App.studentFileStatus = function (studentId, cycleId) {
    var required = App.state.requirements.filter(function (item) { return item.active; });
    var docs = App.state.studentDocuments.filter(function (item) {
      return item.studentId === studentId && item.cycleId === (cycleId || App.state.settings.selectedCycleId) && item.status !== "Eliminado";
    });
    var deliveredIds = new Set(docs.map(function (item) { return item.requirementId; }));
    var missing = required.filter(function (item) { return !deliveredIds.has(item.id); });
    return { complete: missing.length === 0, delivered: required.length - missing.length, total: required.length, missing: missing };
  };

  App.selectedEnrollments = function () {
    return App.state.enrollments.filter(function (item) {
      return item.cycleId === App.state.settings.selectedCycleId && item.status !== "Retirada";
    });
  };

  App.save = function () {
    App.state = window.SGADStorage.saveState(App.state);
  };

  App.audit = function (action, module, record, details, userId) {
    var user = App.userById(userId || (App.currentUser() && App.currentUser().id));
    App.state.audit.unshift({
      id: window.SGADStorage.createId("aud"),
      date: App.nowIso(),
      userId: user ? user.id : "sistema",
      role: user ? (user.role === "directora" ? "Directora" : "Docente") : "Sistema",
      action: action,
      module: module,
      record: record || "—",
      details: details || "—"
    });
    App.save();
  };

  App.notify = function (userId, title, message, targetView, relatedId, type) {
    App.state.notifications.unshift({
      id: window.SGADStorage.createId("not"),
      userId: userId,
      title: title,
      message: message,
      type: type || "info",
      relatedId: relatedId || null,
      targetView: targetView || "dashboard",
      read: false,
      createdAt: App.nowIso()
    });
    App.save();
  };

  App.statusBadge = function (status) {
    var normalized = App.normalizeSearch(status);
    var css = "badge-neutral";
    if (["activo", "activa", "aprobado", "completo", "vigente", "entregado"].indexOf(normalized) >= 0) css = "badge-success";
    else if (["recibido", "en revision", "entregado nuevamente"].indexOf(normalized) >= 0) css = "badge-purple";
    else if (["pendiente", "incompleto", "proxima", "alta"].indexOf(normalized) >= 0) css = "badge-warning";
    else if (["correccion solicitada", "vencido", "eliminado", "cancelado", "inactivo"].indexOf(normalized) >= 0) css = "badge-danger";
    else if (["historico", "cerrado", "promovida"].indexOf(normalized) >= 0) css = "badge-info";
    return '<span class="badge ' + css + '">' + App.escape(status || "Sin estado") + "</span>";
  };

  App.empty = function (title, message) {
    return '<div class="empty-state"><div class="empty-icon">⌕</div><h3>' + App.escape(title) + "</h3><p>" + App.escape(message) + "</p></div>";
  };

  App.formOptions = function (items, valueKey, labelFn, selected, includeAll) {
    var html = includeAll ? '<option value="">' + App.escape(includeAll) + "</option>" : "";
    html += items.map(function (item) {
      var value = item[valueKey];
      var label = typeof labelFn === "function" ? labelFn(item) : item[labelFn];
      return '<option value="' + App.escape(value) + '"' + (String(value) === String(selected) ? " selected" : "") + ">" + App.escape(label) + "</option>";
    }).join("");
    return html;
  };

  App.openModal = function (options) {
    App.closeModal();
    var root = document.getElementById("modal-root");
    var size = options.size ? " " + options.size : "";
    root.innerHTML = '<div class="modal-backdrop" data-action="close-modal"></div>' +
      '<section class="modal-shell' + size + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<header class="modal-head"><div>' + (options.eyebrow ? '<p class="eyebrow">' + App.escape(options.eyebrow) + "</p>" : "") +
      '<h2 id="modal-title">' + App.escape(options.title || "Detalle") + '</h2></div><button class="modal-close" data-action="close-modal" aria-label="Cerrar">×</button></header>' +
      '<div class="modal-body">' + (options.body || "") + "</div>" +
      (options.footer === false ? "" : '<footer class="modal-foot">' + (options.footer || '<button class="btn btn-primary" data-action="close-modal">Cerrar</button>') + "</footer>") +
      "</section>";
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(function () {
      var focusable = root.querySelector("input,select,textarea,button");
      if (focusable) focusable.focus();
    }, 20);
  };

  App.closeModal = function () {
    App.activeObjectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    App.activeObjectUrls = [];
    App.activePreviewRecord = null;
    var root = document.getElementById("modal-root");
    if (!root) return;
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = "";
    document.body.style.overflow = "";
  };

  App.toast = function (message, type) {
    var root = document.getElementById("toast-root");
    var toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    var icon = type === "success" ? "✓" : type === "error" ? "!" : type === "warning" ? "⚠" : "i";
    toast.innerHTML = "<strong>" + icon + "</strong><span>" + App.escape(message) + '</span><button aria-label="Cerrar">×</button>';
    toast.querySelector("button").addEventListener("click", function () { toast.remove(); });
    root.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 4800);
  };

  App.confirm = function (title, message, onConfirm, danger) {
    App.openModal({
      size: "sm",
      eyebrow: danger ? "Confirmación requerida" : "Confirmar acción",
      title: title,
      body: '<div class="alert ' + (danger ? "alert-danger" : "alert-warning") + '"><span>' + (danger ? "⚠" : "i") + "</span><div>" + App.escape(message) + "</div></div>",
      footer: '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button class="btn ' + (danger ? "btn-danger" : "btn-primary") + '" id="confirm-action">Confirmar</button>'
    });
    document.getElementById("confirm-action").addEventListener("click", function () {
      Promise.resolve(onConfirm()).then(function () { App.closeModal(); }).catch(function (error) { App.toast(error.message || "No fue posible completar la acción.", "error"); });
    });
  };


  // ==========================================
  // SGAD - INICIO DE SESIÓN INSTITUCIONAL
  // ==========================================

  App.renderLogin = function () {

    document.getElementById("app").innerHTML = `
      <main class="login-page sgad-login">

        <!-- PANEL IZQUIERDO: INSTITUCIÓN -->
        <section class="login-brand">
          <div class="brand-content">

            <div class="institution-identity">

              <div class="brand-logo-wrap">
                <img
                  src="assets/logo-escuela.png"
                  alt="Escudo de la Escuela Oficial Rural Mixta Orfelinda Osorio Lemus"
                >
              </div>

              <div class="institution-info">
                <p class="institution-eyebrow">
                  ESCUELA OFICIAL RURAL MIXTA
                </p>

                <h1>
                  Orfelinda<br>
                  Osorio Lemus
                </h1>

                <p class="institution-subtitle">
                  Jornada Matutina · Sistema institucional
                </p>
              </div>

            </div>

          </div>
        </section>

        <!-- PANEL DERECHO: ACCESO -->
        <section class="login-panel">

          <div class="login-card">

            <div class="login-system-tag">
              SGAD
            </div>

            <h2>Acceso al sistema</h2>

            <p class="login-description">
              Ingrese con la cuenta asignada por Dirección.
            </p>

            <form id="login-form">

              <div class="form-group">
                <label class="required" for="login-email">
                  Correo institucional
                </label>

                <input
                  class="input"
                  id="login-email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  required
                >
              </div>

              <div class="form-group">

                <label class="required" for="login-password">
                  Contraseña
                </label>

                <div class="input-icon">
                  <input
                    class="input"
                    id="login-password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                  >

                  <button
                    type="button"
                    data-action="toggle-password"
                    aria-label="Mostrar contraseña"
                  >
                    Ver
                  </button>
                </div>

              </div>

              <button
                class="btn btn-primary btn-block login-submit"
                type="submit"
              >
                Ingresar al sistema
              </button>

            </form>

            <!-- ACCESOS DEL PROTOTIPO -->
            <div class="login-help">

              <strong>Accesos de demostración</strong>

              <div class="demo-buttons">

                <button
                  class="btn btn-soft btn-sm"
                  type="button"
                  data-action="demo-fill"
                  data-role="directora"
                >
                  Usar cuenta de directora
                </button>

                <button
                  class="btn btn-soft btn-sm"
                  type="button"
                  data-action="demo-fill"
                  data-role="docente"
                >
                  Usar cuenta de docente
                </button>

              </div>

              <p class="input-hint mb-0">
                Entorno de prueba con datos demostrativos.
              </p>

            </div>

          </div>

        </section>

      </main>
    `;

    document
      .getElementById("login-form")
      .addEventListener("submit", App.handleLogin);

  };


  App.handleLogin = function (event) {
    event.preventDefault();
    var form = new FormData(event.currentTarget);
    var email = String(form.get("email") || "").trim().toLowerCase();
    var password = String(form.get("password") || "");
    var account = CREDENTIALS.find(function (item) { return item.email === email && item.password === password; });
    var user = account && App.userById(account.userId);
    if (!account || !user || !user.active) {
      App.toast("Correo, contraseña o cuenta no válidos.", "error");
      return;
    }
    App.session = { userId: user.id, loginAt: App.nowIso() };
    window.SGADStorage.setSession(App.session);
    App.audit("Inició sesión", "Seguridad", user.email, "Acceso correcto al sistema", user.id);
    App.currentView = user.role === "directora" ? "dashboard" : "teacher-dashboard";
    App.renderShell();
  };

  App.getBadge = function (key) {
    var cycleId = App.state.settings.selectedCycleId;
    var user = App.currentUser();
    if (key === "reviews") return App.state.submissions.filter(function (x) { return ["Recibido", "Entregado nuevamente", "En revisión"].indexOf(x.status) >= 0; }).length;
    if (key === "students") return App.state.enrollments.filter(function (x) { return x.cycleId === cycleId && x.status !== "Retirada"; }).length;
    if (key === "requests") return App.state.deliveryRequests.filter(function (x) { return x.cycleId === cycleId && x.status === "Vigente"; }).length;
    if (key === "trash") return App.state.trash.length;
    if (key === "teacherRequests") return App.state.deliveryRequests.filter(function (x) { return x.cycleId === cycleId && x.status === "Vigente" && x.targetUserIds.indexOf(user.id) >= 0 && !App.state.submissions.some(function (s) { return s.requestId === x.id && s.teacherId === user.id && s.status !== "Corrección solicitada"; }); }).length;
    if (key === "corrections") return App.state.submissions.filter(function (x) { return x.teacherId === user.id && x.status === "Corrección solicitada"; }).length;
    return 0;
  };

  App.renderNavigation = function () {
    var user = App.currentUser();
    var nav = user.role === "directora" ? DIRECTOR_NAV : TEACHER_NAV;
    return nav.map(function (item) {
      if (item.section) return '<div class="nav-section">' + App.escape(item.section) + "</div>";
      var badge = item.badge ? App.getBadge(item.badge) : 0;
      return '<button class="nav-link ' + (App.currentView === item.id ? "active" : "") + '" data-action="navigate" data-view="' + item.id + '"><span class="nav-icon">' + item.icon + '</span><span class="nav-label">' + App.escape(item.label) + "</span>" + (badge ? '<span class="nav-badge">' + badge + "</span>" : "") + "</button>";
    }).join("");
  };

  App.notificationMenu = function () {
    var user = App.currentUser();
    var items = App.state.notifications.filter(function (item) { return item.userId === user.id; }).slice(0, 12);
    return '<div class="notification-menu hidden" id="notification-menu"><div class="notification-head"><strong>Notificaciones</strong><button class="link-button" data-action="mark-all-read">Marcar todas</button></div><div class="notification-list">' +
      (items.length ? items.map(function (item) {
        return '<button class="notification-item ' + (!item.read ? "unread" : "") + '" data-action="open-notification" data-id="' + item.id + '"><span class="list-icon">' + (item.read ? "○" : "●") + '</span><span><strong>' + App.escape(item.title) + "</strong><small>" + App.escape(item.message) + " · " + App.formatDate(item.createdAt, true) + "</small></span></button>";
      }).join("") : App.empty("Sin notificaciones", "No hay avisos para esta cuenta.")) + "</div></div>";
  };

  App.renderShell = function () {
    var user = App.currentUser();
    if (!user) { App.renderLogin(); return; }
    var unread = App.state.notifications.filter(function (item) { return item.userId === user.id && !item.read; }).length;
    var cycles = App.formOptions(App.state.cycles.slice().sort(function (a,b) { return b.year - a.year; }), "id", "name", App.state.settings.selectedCycleId);
    document.getElementById("app").innerHTML = '<div class="app-shell"><aside class="sidebar" id="sidebar">' +
      '<div class="side-brand"><img src="assets/logo-escuela.png" alt="Logotipo"><div><strong>SGAD</strong><span>EORM Orfelinda Osorio</span></div></div>' +
      '<div class="role-chip"><span class="role-dot"></span>' + (user.role === "directora" ? "DIRECCIÓN GENERAL" : "DOCENTE") + '</div><nav class="nav-scroll" aria-label="Navegación principal">' + App.renderNavigation() + '</nav><div class="side-footer"><button class="btn btn-block" data-action="logout">Cerrar sesión</button></div></aside>' +
      '<div class="main-column"><header class="topbar"><div class="topbar-left"><button class="btn btn-secondary btn-icon mobile-menu" data-action="toggle-sidebar" aria-label="Abrir menú">☰</button><span class="topbar-title">SGAD</span><span class="topbar-school">EORM Orfelinda Osorio Lemus</span></div>' +
      '<div class="topbar-actions"><label class="cycle-select"><span>Ciclo escolar</span><select id="cycle-selector" aria-label="Ciclo escolar">' + cycles + '</select></label>' +
      '<div class="notification-wrap"><button class="btn btn-secondary btn-icon notification-button" data-action="toggle-notifications" aria-label="Notificaciones">🔔' + (unread ? '<span class="notification-count">' + unread + "</span>" : "") + "</button>" + App.notificationMenu() + '</div><div class="user-summary"><span class="avatar">' + App.escape(user.initials) + '</span><div><strong>' + App.escape(user.name) + "</strong><small>" + (user.role === "directora" ? "Directora" : "Docente") + '</small></div></div></div></header><main id="page-content"></main></div></div>';
    document.getElementById("cycle-selector").addEventListener("change", function (event) {
      App.state.settings.selectedCycleId = event.target.value;
      App.save();
      App.renderShell();
    });
    App.renderView();
  };

  App.renderView = function () {
    var target = document.getElementById("page-content");
    var user = App.currentUser();
    var directorViews = ["dashboard", "reviews", "repository", "enrollments", "cycles", "requests", "users", "reports", "trash", "backups", "audit"];
    var teacherViews = ["teacher-dashboard", "teacher-students", "teacher-requests", "teacher-documents", "teacher-corrections", "teacher-receipts"];
    var allowedViews = user && user.role === "directora" ? directorViews : teacherViews;
    if (allowedViews.indexOf(App.currentView) === -1) {
      App.currentView = user && user.role === "directora" ? "dashboard" : "teacher-dashboard";
    }
    var renderer = App.pages[App.currentView];
    if (!renderer) {
      target.innerHTML = '<div class="page">' + App.empty("Pantalla no disponible", "La vista solicitada no existe.") + "</div>";
      return;
    }
    target.innerHTML = renderer();
    if (App.pageMounted[App.currentView]) App.pageMounted[App.currentView]();
    var active = document.querySelector(".nav-link.active");
    if (active) active.scrollIntoView({ block: "nearest" });
  };

  App.pageMounted = {};

  App.findRecord = function (collection, id) {
    var list = App.state[collection];
    return Array.isArray(list) ? list.find(function (item) { return item.id === id; }) : null;
  };

  App.documentLabel = function (record) {
    return record.title || record.code || record.fileName || record.id;
  };

  App.previewRecordFile = function (record, context) {
    if (!record || !record.fileId) {
      App.openModal({ size: "sm", eyebrow: "Archivo digital", title: "Archivo no disponible", body: '<div class="alert alert-warning"><span>⚠</span><div>Este registro pertenece a los datos iniciales de demostración y no contiene un archivo binario. Puede reemplazarlo o subir una nueva versión para probar la visualización.</div></div>' });
      return Promise.resolve();
    }
    return window.SGADStorage.getFile(record.fileId).then(function (fileRecord) {
      if (!fileRecord || !fileRecord.blob) throw new Error("El archivo relacionado no está disponible.");
      var type = fileRecord.type || record.mimeType || "";
      if (type !== "application/pdf" && type.indexOf("image/") !== 0) {
        App.openModal({ size: "sm", eyebrow: "Archivo digital", title: "Vista previa no disponible", body: '<div class="alert alert-info"><span>i</span><div>Este formato no puede mostrarse directamente. Utilice la opción Descargar archivo.</div></div>' });
        return;
      }
      var url = URL.createObjectURL(fileRecord.blob);
      var preview = type === "application/pdf" ? '<iframe src="' + url + '" title="Vista previa"></iframe>' : '<img src="' + url + '" alt="Vista previa del archivo">';
      App.openModal({ size: "lg", eyebrow: "Archivo digital", title: App.documentLabel(record), body: '<p class="muted mt-0">' + App.escape(fileRecord.name) + '</p><div class="file-preview">' + preview + "</div>", footer: '<button class="btn btn-secondary" data-action="close-modal">Cerrar</button><button class="btn btn-primary" data-action="download-preview-direct">Descargar archivo</button>' });
      App.activeObjectUrls.push(url);
      App.activePreviewRecord = { record: record, context: context };
      App.audit("Visualizó documento", context.module || "Documentos", record.code || record.id, App.documentLabel(record) + " · " + fileRecord.name);
    }).catch(function (error) { App.toast(error.message, "error"); });
  };

  App.downloadRecordFile = function (record, context) {
    if (!record || !record.fileId) { App.toast("Este registro no tiene un archivo real disponible.", "warning"); return Promise.resolve(); }
    return window.SGADStorage.getFile(record.fileId).then(function (fileRecord) {
      if (!fileRecord || !fileRecord.blob) throw new Error("No fue posible recuperar el archivo.");
      window.SGADStorage.downloadBlob(fileRecord.blob, fileRecord.name || record.fileName);
      App.audit("Descargó documento", context.module || "Documentos", record.code || record.id, App.documentLabel(record) + " · " + (fileRecord.name || record.fileName));
    }).catch(function (error) { App.toast(error.message, "error"); });
  };

  App.actionContext = function (element) {
    return { collection: element.dataset.collection, module: element.dataset.module || "Documentos" };
  };

  App.canAccessRecord = function (collection, record) {
    var user = App.currentUser();
    if (!user || !record) return false;
    if (user.role === "directora") return true;
    if (collection === "submissions") return record.teacherId === user.id;
    if (collection === "repositoryDocuments") return record.access === "Dirección y docentes";
    if (collection === "studentDocuments") {
      var enrollment = App.studentEnrollment(record.studentId, record.cycleId);
      return !!(enrollment && App.teacherSections(user.id, record.cycleId).some(function (section) { return section.id === enrollment.sectionId; }));
    }
    return false;
  };

  App.actions["toggle-password"] = function (element) {
    var input = document.getElementById("login-password");
    input.type = input.type === "password" ? "text" : "password";
    element.setAttribute("aria-label", input.type === "password" ? "Mostrar contraseña" : "Ocultar contraseña");
  };

  App.actions["demo-fill"] = function (element) {
    var director = element.dataset.role === "directora";
    document.getElementById("login-email").value = director ? "directora@sgad.demo" : "carlos@sgad.demo";
    document.getElementById("login-password").value = director ? "Demo2026!" : "Docente2026!";
  };

  App.actions.logout = function () {
    var user = App.currentUser();
    if (user) App.audit("Cerró sesión", "Seguridad", user.email, "Cierre correcto", user.id);
    App.session = null;
    window.SGADStorage.setSession(null);
    App.closeModal();
    App.renderLogin();
  };

  App.actions.navigate = function (element) {
    App.currentView = element.dataset.view;
    App.renderShell();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  App.actions["toggle-sidebar"] = function () { document.getElementById("sidebar").classList.toggle("open"); };
  App.actions["toggle-notifications"] = function () { document.getElementById("notification-menu").classList.toggle("hidden"); };
  App.actions["close-modal"] = function () { App.closeModal(); };

  App.actions["mark-all-read"] = function () {
    var user = App.currentUser();
    App.state.notifications.forEach(function (item) { if (item.userId === user.id) item.read = true; });
    App.save();
    App.renderShell();
  };

  App.actions["open-notification"] = function (element) {
    var item = App.state.notifications.find(function (x) { return x.id === element.dataset.id; });
    if (!item) return;
    item.read = true;
    App.save();
    App.currentView = item.targetView;
    App.renderShell();
  };

  App.actions["preview-file"] = function (element) {
    var record = App.findRecord(element.dataset.collection, element.dataset.id);
    if (!App.canAccessRecord(element.dataset.collection, record)) { App.toast("No tiene permiso para visualizar este archivo.", "error"); return; }
    return App.previewRecordFile(record, App.actionContext(element));
  };

  App.actions["download-file"] = function (element) {
    var record = App.findRecord(element.dataset.collection, element.dataset.id);
    if (!App.canAccessRecord(element.dataset.collection, record)) { App.toast("No tiene permiso para descargar este archivo.", "error"); return; }
    return App.downloadRecordFile(record, App.actionContext(element));
  };

  App.actions["download-current-preview"] = function (element) {
    var record = App.findRecord(element.dataset.collection, element.dataset.id);
    return App.downloadRecordFile(record, App.actionContext(element));
  };

  App.actions["download-preview-direct"] = function () {
    if (!App.activePreviewRecord) return;
    return App.downloadRecordFile(App.activePreviewRecord.record, App.activePreviewRecord.context);
  };

  document.addEventListener("click", function (event) {
    var element = event.target.closest("[data-action]");
    if (!element) return;
    var current = App.currentUser();
    var teacherAllowed = ["open-profile", "profile-back", "edit-my-profile", "save-my-profile", "logout", "navigate", "toggle-sidebar", "toggle-notifications", "close-modal", "mark-all-read", "open-notification", "preview-file", "download-file", "download-current-preview", "download-preview-direct", "teacher-view-student", "open-teacher-request", "save-teacher-submission", "view-receipt", "print-receipt", "teacher-download-version"];
    if (current && current.role === "docente" && teacherAllowed.indexOf(element.dataset.action) === -1) {
      event.preventDefault();
      App.toast("Esta acción requiere permisos de Dirección.", "error");
      return;
    }
    var action = App.actions[element.dataset.action];
    if (!action) return;
    if (element.tagName === "BUTTON" && element.type !== "submit") event.preventDefault();
    try {
      var result = action(element, event);
      if (result && typeof result.catch === "function") result.catch(function (error) { App.toast(error.message || "Ocurrió un error.", "error"); });
    } catch (error) {
      console.error(error);
      App.toast(error.message || "Ocurrió un error.", "error");
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.getElementById("modal-root").classList.contains("open")) App.closeModal();
  });


  // =====================================================
  // SGAD - CORRECCIONES DE INTEGRIDAD Y PERMISOS
  // =====================================================

  // Obtiene el ciclo marcado como vigente.
  // No confunde el ciclo consultado con el ciclo de trabajo.
  App.activeCycle = function () {
    var configuredId = App.state.settings.activeCycleId;

    var configured = App.state.cycles.find(function (cycle) {
      return cycle.id === configuredId;
    });

    if (configured) return configured;

    return App.state.cycles.find(function (cycle) {
      return cycle.status === "Activo";
    }) || null;
  };

  // Recupera el ciclo seleccionado para consultar.
  App.selectedCycle = function () {
    var selectedId = App.state.settings.selectedCycleId;

    return App.state.cycles.find(function (cycle) {
      return cycle.id === selectedId;
    }) || App.activeCycle();
  };

  // Solo el ciclo vigente puede recibir modificaciones.
  // Un ciclo histórico puede consultarse aunque sus datos
  // antiguos indiquen erróneamente el estado "Activo".
  App.isSelectedCycleWritable = function () {
    var selected = App.selectedCycle();
    var active = App.activeCycle();

    return !!(
      selected &&
      active &&
      selected.id === active.id &&
      selected.status === "Activo"
    );
  };

  // Matrícula correspondiente al estudiante y ciclo.
  // Excluye las matrículas retiradas.
  App.studentEnrollment = function (studentId, cycleId) {
    var targetCycleId =
      cycleId || App.state.settings.selectedCycleId;

    return App.state.enrollments.find(function (item) {
      return item.studentId === studentId &&
        item.cycleId === targetCycleId &&
        item.status !== "Retirada";
    }) || null;
  };

  // Fechas locales para formularios y comparaciones.
  // Evita que la fecha UTC cambie el día en Guatemala.
  App.todayIso = function () {
    var today = new Date();

    var year = today.getFullYear();
    var month = String(
      today.getMonth() + 1
    ).padStart(2, "0");
    var day = String(
      today.getDate()
    ).padStart(2, "0");

    return year + "-" + month + "-" + day;
  };

  // Comprobación de acceso por rol y permisos.
  App.canAccessRecord = function (collection, record) {
    var user = App.currentUser();

    if (!user || !user.active || !record) {
      return false;
    }

    if (user.role === "directora") {
      return true;
    }

    if (user.role !== "docente") {
      return false;
    }

    var permissions = user.permissions || {};

    if (collection === "submissions") {
      return !!(
        permissions.viewRequests &&
        record.teacherId === user.id
      );
    }

    if (collection === "repositoryDocuments") {
      return !!(
        permissions.viewFiles &&
        record.access === "Dirección y docentes"
      );
    }

    if (collection === "studentDocuments") {
      if (!permissions.viewStudents ||
          !permissions.viewFiles) {
        return false;
      }

      var enrollment = App.studentEnrollment(
        record.studentId,
        record.cycleId
      );

      if (!enrollment) return false;

      return App.teacherSections(
        user.id,
        record.cycleId
      ).some(function (section) {
        return section.id === enrollment.sectionId;
      });
    }

    return false;
  };

  // Comprobación adicional para descargas.
  App.canDownloadRecord = function (collection, record) {
    var user = App.currentUser();

    if (!App.canAccessRecord(collection, record)) {
      return false;
    }

    if (user.role === "directora") {
      return true;
    }

    return !!(
      user.permissions &&
      user.permissions.downloadDocuments
    );
  };

  App.actions["download-file"] = function (element) {
    var collection = element.dataset.collection;
    var record = App.findRecord(
      collection,
      element.dataset.id
    );

    if (!App.canDownloadRecord(collection, record)) {
      App.toast(
        "No tiene permiso para descargar este archivo.",
        "error"
      );
      return;
    }

    return App.downloadRecordFile(
      record,
      App.actionContext(element)
    );
  };

  App.actions["download-current-preview"] =
    App.actions["download-file"];

  App.actions["download-preview-direct"] = function () {
    var preview = App.activePreviewRecord;

    if (!preview) return;

    var context = preview.context || {};
    var collection = context.collection;

    if (
      !collection ||
      !App.canDownloadRecord(
        collection,
        preview.record
      )
    ) {
      App.toast(
        "No tiene permiso para descargar este archivo.",
        "error"
      );
      return;
    }

    return App.downloadRecordFile(
      preview.record,
      context
    );
  };

  // Guarda utilizando la verificación incorporada
  // en storage.js para detectar cambios de otra pestaña.
  App.save = function () {
    try {
      App.state = window.SGADStorage.saveState(
        App.state
      );

      return true;
    } catch (error) {
      console.error(
        "SGAD: se bloqueó el guardado:",
        error
      );

      App.toast(
        error.message ||
        "No fue posible guardar los cambios.",
        "error"
      );

      throw error;
    }
  };

  window.SGADApp = App;
})();

