(function () {
  "use strict";

  var App = window.SGADApp;
  if (!App) return;

  var MAX_BYTES = 4 * 1024 * 1024;
  var TIPOS = ["image/jpeg", "image/png", "image/webp"];

  function claveUsuario() {
    var user = App.currentUser();
    return user ? "sgad-profile-photo-" + user.id : null;
  }

  function obtenerFoto() {
    var clave = claveUsuario();
    if (!clave) return null;

    try {
      return localStorage.getItem(clave);
    } catch (error) {
      return null;
    }
  }

  function actualizarAvatar(elemento, foto) {
    if (!elemento) return;

    if (foto) {
      elemento.style.backgroundImage = 'url("' + foto + '")';
      elemento.style.backgroundSize = "cover";
      elemento.style.backgroundPosition = "center";
      elemento.style.backgroundRepeat = "no-repeat";
      elemento.style.color = "transparent";
    } else {
      elemento.style.backgroundImage = "";
      elemento.style.color = "";
    }
  }

  function actualizarFotografias() {
    var foto = obtenerFoto();

    actualizarAvatar(
      document.querySelector(".user-summary .avatar"),
      foto
    );

    actualizarAvatar(
      document.querySelector(".perfil-heading .perfil-avatar"),
      foto
    );

    var heading = document.querySelector(".perfil-heading");
    if (!heading) return;

    if (!heading.querySelector(".perfil-photo-controls")) {
      var controls = document.createElement("div");
      controls.className = "perfil-photo-controls";

      controls.innerHTML =
        '<input id="perfil-foto-input" type="file" ' +
        'accept="image/jpeg,image/png,image/webp" hidden>' +
        '<button type="button" class="btn btn-secondary btn-sm" ' +
        'data-photo-action="choose">📷 Cambiar foto</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" ' +
        'data-photo-action="remove">Quitar foto</button>';

      heading.appendChild(controls);
    }

    var quitar = heading.querySelector(
      '[data-photo-action="remove"]'
    );

    if (quitar) quitar.hidden = !foto;
  }

  function procesarImagen(file) {
    if (!file) return;

    if (!TIPOS.includes(file.type)) {
      App.toast(
        "Seleccione una fotografía JPG, PNG o WebP.",
        "warning"
      );
      return;
    }

    if (file.size > MAX_BYTES) {
      App.toast(
        "La fotografía no debe superar los 4 MB.",
        "warning"
      );
      return;
    }

    var url = URL.createObjectURL(file);
    var imagen = new Image();

    imagen.onload = function () {
      try {
        var canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;

        var ctx = canvas.getContext("2d");
        var lado = Math.min(
          imagen.naturalWidth,
          imagen.naturalHeight
        );

        var x = (imagen.naturalWidth - lado) / 2;
        var y = (imagen.naturalHeight - lado) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 256, 256);

        ctx.drawImage(
          imagen,
          x, y, lado, lado,
          0, 0, 256, 256
        );

        var foto = canvas.toDataURL("image/jpeg", 0.85);
        var clave = claveUsuario();

        if (!clave) return;

        localStorage.setItem(clave, foto);

        actualizarFotografias();
        App.toast(
          "Fotografía de perfil actualizada.",
          "success"
        );

      } catch (error) {
        App.toast(
          "No se pudo guardar la fotografía.",
          "error"
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    imagen.onerror = function () {
      URL.revokeObjectURL(url);
      App.toast(
        "No se pudo leer la fotografía seleccionada.",
        "error"
      );
    };

    imagen.src = url;
  }

  document.addEventListener("click", function (event) {
    var boton = event.target.closest("[data-photo-action]");
    if (!boton) return;

    event.preventDefault();
    event.stopPropagation();

    var accion = boton.dataset.photoAction;

    if (accion === "choose") {
      var input = document.getElementById("perfil-foto-input");
      if (input) input.click();
      return;
    }

    if (accion === "remove") {
      var clave = claveUsuario();
      if (!clave) return;

      localStorage.removeItem(clave);
      App.renderShell();
      App.toast(
        "Fotografía eliminada. Se muestran las iniciales.",
        "success"
      );
    }
  });

  document.addEventListener("change", function (event) {
    if (event.target.id !== "perfil-foto-input") return;

    var file = event.target.files[0];
    procesarImagen(file);

    event.target.value = "";
  });

  var renderShellOriginal = App.renderShell;

  App.renderShell = function () {
    var resultado = renderShellOriginal.apply(this, arguments);
    actualizarFotografias();
    return resultado;
  };

  var renderViewOriginal = App.renderView;

  App.renderView = function () {
    var resultado = renderViewOriginal.apply(this, arguments);
    actualizarFotografias();
    return resultado;
  };

  document.addEventListener("DOMContentLoaded", function () {
    actualizarFotografias();
  });

})();
