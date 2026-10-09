
(function () {
  "use strict";

  var App = window.SGADApp;
  var externalChangeDetected = false;

  function showStartupError(error) {
    console.error("Error al iniciar SGAD:", error);

    var root = document.getElementById("app");

    if (!root) return;

    root.innerHTML = "";

    var container = document.createElement("main");
    container.className = "login-page";

    var panel = document.createElement("section");
    panel.className = "login-panel";

    var card = document.createElement("div");
    card.className = "login-card";

    var title = document.createElement("h2");
    title.textContent = "No fue posible iniciar el SGAD";

    var message = document.createElement("p");
    message.textContent =
      "Se encontró un problema al cargar los datos guardados. " +
      "Por seguridad, no se han restablecido ni eliminado.";

    var detail = document.createElement("p");
    detail.className = "input-hint";
    detail.textContent =
      error && error.message
        ? error.message
        : "Error desconocido.";

    var instructions = document.createElement("p");
    instructions.textContent =
      "Conserve sus respaldos y revise el error antes de " +
      "modificar el almacenamiento del navegador.";

    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(detail);
    card.appendChild(instructions);

    panel.appendChild(card);
    container.appendChild(panel);
    root.appendChild(container);
  }

  function start() {
    try {
      if (!App || !window.SGADStorage) {
        throw new Error(
          "No se cargaron todos los componentes del sistema."
        );
      }

      App.state = window.SGADStorage.loadState();
      App.session = window.SGADStorage.getSession();

      var user = App.currentUser();

      if (user && user.active) {
        App.currentView =
          user.role === "directora"
            ? "dashboard"
            : "teacher-dashboard";

        App.renderShell();

      } else {
        App.session = null;

        window.SGADStorage.setSession(null);
        App.renderLogin();
      }

    } catch (error) {
      showStartupError(error);
    }
  }

  // Detecta cambios guardados desde otra pestaña.
  // No recarga automáticamente para evitar perder
  // información que todavía está en pantalla.
  window.addEventListener("storage", function (event) {
    if (
      !window.SGADStorage ||
      event.key !== window.SGADStorage.STATE_KEY
    ) {
      return;
    }

    if (externalChangeDetected) return;

    externalChangeDetected = true;

    console.warn(
      "SGAD: otra pestaña modificó los datos guardados."
    );

    if (App && typeof App.toast === "function") {
      var toastRoot = document.getElementById("toast-root");

      if (toastRoot) {
        App.toast(
          "Otra pestaña modificó los datos del SGAD. " +
          "Evite realizar cambios desde varias pestañas.",
          "warning"
        );
      }
    }
  });

  window.addEventListener("error", function (event) {
    console.error(
      "SGAD:",
      event.error || event.message
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    console.error("SGAD async:", event.reason);

    var root = document.getElementById("toast-root");

    if (
      root &&
      App &&
      typeof App.toast === "function" &&
      event.reason &&
      event.reason.message
    ) {
      App.toast(event.reason.message, "error");
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
