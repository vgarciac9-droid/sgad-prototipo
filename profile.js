(function () {
  "use strict";

  var App = window.SGADApp;
  if (!App) return;

  function esc(value) {
    return App.escape(value == null ? "" : value);
  }

  function perfil() {
    var user = App.currentUser();
    if (!user) return "";

    var cycle = App.selectedCycle();
    var sections = App.teacherSections(
      user.id,
      cycle ? cycle.id : null
    );

    var role = user.role === "directora"
      ? "Directora"
      : "Docente";

    var sectionsHtml = user.role === "directora"
      ? '<p>Acceso institucional como Directora.</p>'
      : sections.length
        ? sections.map(function (section) {
            var nombresGrados = [
              "", "Primero", "Segundo", "Tercero",
              "Cuarto", "Quinto", "Sexto"
            ];

            var numeroGrado = Number(section.grade);
            var nombreGrado = nombresGrados[numeroGrado] || "";

            var title = section.name || section.label ||
              (nombreGrado
                ? nombreGrado + " " + (section.letter || "")
                : "Sección sin nombre");

            return '<div class="perfil-section-item">' +
              '<span>📘 ' + esc(title) + '</span>' +
              '</div>';
          }).join("")
        : '<p>No hay secciones asignadas en este ciclo.</p>';

    return `
      <div class="page perfil-page">
        <div class="page-head">
          <div>
            <p class="eyebrow">Mi espacio personal</p>
            <h1>Mi perfil</h1>
            <p>Información de mi cuenta institucional.</p>
          </div>
        </div>

        <section class="perfil-main">
          <div class="perfil-heading">
            <div class="perfil-avatar">${esc(user.initials || "SG")}</div>
            <div>
              <h2>${esc(user.name)}</h2>
              <p>${esc(role)} · ${user.active === false ? "Cuenta inactiva" : "Cuenta activa"}</p>
            </div>
          </div>

          <div class="perfil-cards">
            <article class="perfil-tile perfil-green">
              <span class="perfil-tile-icon">✉</span>
              <span class="perfil-tile-label">Correo institucional</span>
              <strong>${esc(user.email)}</strong>
            </article>

            <article class="perfil-tile perfil-yellow">
              <span class="perfil-tile-icon">☎</span>
              <span class="perfil-tile-label">Teléfono</span>
              <strong>${esc(user.phone || "No registrado")}</strong>
            </article>

            <article class="perfil-tile perfil-blue">
              <span class="perfil-tile-icon">▦</span>
              <span class="perfil-tile-label">Fecha de nacimiento</span>
              <strong>${user.birthDate ? esc(App.formatDate(user.birthDate)) : "No registrada"}</strong>
            </article>

            <article class="perfil-tile perfil-red">
              <span class="perfil-tile-icon">♙</span>
              <span class="perfil-tile-label">Rol institucional</span>
              <strong>${esc(role)}</strong>
            </article>
          </div>

          <div class="perfil-lower">
            <article class="perfil-section-card">
              <h3>Mis secciones asignadas</h3>
              <p class="perfil-muted">Ciclo ${cycle ? esc(cycle.year) : "seleccionado"}</p>
              ${sectionsHtml}
            </article>

            <article class="perfil-section-card">
              <h3>Seguridad de la cuenta</h3>
              <p>Tu cuenta es de uso individual. Los permisos y asignaciones los administra Dirección.</p>
              <p class="perfil-muted">El cambio de contraseña se habilitará cuando definamos el sistema de autenticación.</p>
            </article>
          </div>

          <div class="perfil-footer">
            <button class="btn btn-secondary" data-action="profile-back">
              Volver al panel
            </button>
            <button class="btn btn-primary" data-action="edit-my-profile">
              Editar perfil
            </button>
          </div>
        </section>
      </div>
    `;
  }

  App.pages.profile = perfil;

  var renderViewOriginal = App.renderView;

  App.renderView = function () {
    if (App.currentView === "profile" && App.currentUser()) {
      var target = document.getElementById("page-content");
      if (target) target.innerHTML = perfil();
      return;
    }
    return renderViewOriginal.apply(this, arguments);
  };

  var renderShellOriginal = App.renderShell;

  App.renderShell = function () {
    var result = renderShellOriginal.apply(this, arguments);
    var summary = document.querySelector(".user-summary");

    if (summary) {
      summary.setAttribute("data-action", "open-profile");
      summary.setAttribute("role", "button");
      summary.setAttribute("tabindex", "0");
      summary.setAttribute("title", "Abrir mi perfil");
      summary.setAttribute("aria-label", "Abrir mi perfil");
    }

    return result;
  };

  App.actions["open-profile"] = function () {
    App.currentView = "profile";
    App.renderShell();

requestAnimationFrame(function () {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant"
  });

  var contenido = document.querySelector(".main-content");
  if (contenido) contenido.scrollTop = 0;
});
  };

  App.actions["profile-back"] = function () {
    var user = App.currentUser();
    App.currentView = user.role === "directora"
      ? "dashboard"
      : "teacher-dashboard";
    App.renderShell();
  };

  App.actions["edit-my-profile"] = function () {
    var user = App.currentUser();

    App.openModal({
      size: "md",
      eyebrow: "Datos personales",
      title: "Editar mi perfil",
      body:
        '<form id="sgad-my-profile-form">' +
        '<div class="form-group"><label class="required">Nombre completo</label>' +
        '<input class="input" name="name" maxlength="120" required value="' +
        esc(user.name) + '"></div>' +

        '<div class="form-group"><label>Correo institucional</label>' +
        '<input class="input" value="' + esc(user.email) +
        '" readonly title="El correo de acceso se administra por Dirección."></div>' +

        '<div class="form-group"><label>Teléfono</label>' +
        '<input class="input" name="phone" type="tel" maxlength="20" value="' +
        esc(user.phone || "") + '" placeholder="Ej. 55555555"></div>' +

        '<div class="form-group"><label>Fecha de nacimiento (opcional)</label>' +
        '<input class="input" name="birthDate" type="date" value="' +
        esc(user.birthDate || "") + '"></div>' +
        '</form>',
      footer:
        '<button class="btn btn-secondary" data-action="close-modal">Cancelar</button>' +
        '<button class="btn btn-primary" data-action="save-my-profile">Guardar cambios</button>'
    });
  };

  App.actions["save-my-profile"] = function () {
    var form = document.getElementById("sgad-my-profile-form");
    var user = App.currentUser();

    if (!form || !user || !form.reportValidity()) return;

    var data = new FormData(form);
    var name = String(data.get("name") || "").trim();
    var phone = String(data.get("phone") || "").trim();
    var birthDate = String(data.get("birthDate") || "");

    if (name.length < 3) {
      App.toast("Escriba un nombre válido.", "warning");
      return;
    }

    if (phone && !/^[0-9+()\s-]{7,20}$/.test(phone)) {
      App.toast("Ingrese un teléfono válido.", "warning");
      return;
    }

    if (birthDate && birthDate > App.todayIso()) {
      App.toast("La fecha de nacimiento no puede ser futura.", "warning");
      return;
    }

    var previous = user.name;

    user.name = name;
    user.phone = phone;
    user.birthDate = birthDate;

    var parts = name.split(/\s+/);
    user.initials = (
      (parts[0] || "").charAt(0) +
      (parts[1] || "").charAt(0)
    ).toUpperCase();

    App.save();

    if (typeof App.audit === "function") {
      App.audit(
        "Actualizó perfil personal",
        "Usuarios",
        user.email,
        "Cambio de datos personales de " + previous
      );
    }

    App.closeModal();
    App.renderShell();
    App.toast("Perfil actualizado correctamente.", "success");
  };

  document.addEventListener("keydown", function (event) {
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.classList &&
      event.target.classList.contains("user-summary")
    ) {
      event.preventDefault();
      event.target.click();
    }
  });
})();
