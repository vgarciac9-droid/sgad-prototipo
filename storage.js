
(function () {
  "use strict";

  var STATE_KEY = "sgad_state_v1";
  var SESSION_KEY = "sgad_session_v1";
  var DB_NAME = "sgad_files_v1";
  var DB_VERSION = 1;
  var STORE_NAME = "files";
  var lastKnownRaw = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDocument(item) {
    item = item && typeof item === "object" ? item : {};

    return Object.assign({
      fileId: null,
      fileName: "",
      mimeType: "",
      fileSize: 0,
      version: 1,
      versions: []
    }, item, {
      versions: Array.isArray(item.versions)
        ? item.versions
        : []
    });
  }

  function normalizeState(saved) {
    if (
      !saved ||
      typeof saved !== "object" ||
      Array.isArray(saved) ||
      Number(saved.schemaVersion) !== 2
    ) {
      throw new Error(
        "Los datos guardados no tienen un formato compatible. No se han reemplazado."
      );
    }

    var base = window.SGAD_CREATE_DEFAULT_STATE();

    var required = [
      "cycles",
      "users",
      "sections",
      "studentIdentities",
      "enrollments",
      "requirements",
      "studentDocuments",
      "documentCategories",
      "repositoryDocuments",
      "deliveryRequests",
      "submissions",
      "notifications",
      "audit",
      "trash"
    ];

    required.forEach(function (key) {
      if (!Array.isArray(saved[key])) {
        throw new Error(
          "Falta la colección " + key + " en los datos guardados."
        );
      }
    });

    if (
      !saved.settings ||
      typeof saved.settings !== "object" ||
      Array.isArray(saved.settings)
    ) {
      throw new Error(
        "Falta la configuración de los datos guardados."
      );
    }

    var normalized = Object.assign({}, base, saved);

    normalized.settings = Object.assign(
      {},
      base.settings,
      saved.settings
    );

    normalized.users = normalized.users.map(function (item) {
      var defaults = base.users.find(function (u) {
        return u.id === item.id;
      });

      return Object.assign({}, defaults || {}, item, {
        permissions: Object.assign(
          {},
          defaults ? defaults.permissions : {},
          item.permissions || {}
        )
      });
    });

    normalized.repositoryDocuments =
      normalized.repositoryDocuments.map(normalizeDocument);

    normalized.studentDocuments =
      normalized.studentDocuments.map(normalizeDocument);

    normalized.submissions =
      normalized.submissions.map(normalizeDocument);

    normalized.trash = normalized.trash.map(function (item) {
      return Object.assign({
        deletedAt: new Date().toISOString(),
        deletedBy: "usr-dir",
        reason: ""
      }, item);
    });

    normalized.schemaVersion = 2;

    return normalized;
  }

  function loadState() {
    var raw = localStorage.getItem(STATE_KEY);

    if (raw === null) {
      lastKnownRaw = null;
      return window.SGAD_CREATE_DEFAULT_STATE();
    }

    try {
      var state = normalizeState(JSON.parse(raw));
      lastKnownRaw = raw;
      return state;
    } catch (error) {
      console.error(
        "SGAD: no se reemplazaron los datos existentes:",
        error
      );
      throw error;
    }
  }

  function saveState(state) {
    // Impide guardar datos antiguos si otra pestaña
    // modificó el almacenamiento desde la última lectura.
    var currentRaw = localStorage.getItem(STATE_KEY);

    if (currentRaw !== lastKnownRaw) {
      throw new Error(
        "Otra pestaña modificó los datos del SGAD. " +
        "NO se guardaron estos cambios para evitar " +
        "sobrescribir registros. Cierre las otras " +
        "pestañas, conserve su respaldo y recargue " +
        "esta página."
      );
    }

    var clean = clone(state);
    clean.lastUpdatedAt = new Date().toISOString();

    var newRaw = JSON.stringify(clean);

    localStorage.setItem(STATE_KEY, newRaw);

    lastKnownRaw = newRaw;

    return clean;
  }

  function resetState() {
    // Solo debe ejecutarse desde la acción de
    // restablecimiento confirmada por el usuario.
    localStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(SESSION_KEY);

    lastKnownRaw = null;

    return clearFiles().then(function () {
      return window.SGAD_CREATE_DEFAULT_STATE();
    });
  }

  function getSession() {
    try {
      return JSON.parse(
        sessionStorage.getItem(SESSION_KEY) || "null"
      );
    } catch (error) {
      return null;
    }
  }

  function setSession(session) {
    if (!session) {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
      );
    }
  }

  function openFilesDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        return reject(
          new Error("IndexedDB no está disponible.")
        );
      }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        var db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "fileId"
          });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(
          request.error ||
          new Error("No se pudo abrir IndexedDB.")
        );
      };
    });
  }

  function withStore(mode, executor) {
    return openFilesDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, mode);
        var result;

        tx.oncomplete = function () {
          db.close();
          resolve(result);
        };

        tx.onerror = function () {
          db.close();
          reject(
            tx.error ||
            new Error("Error en IndexedDB.")
          );
        };

        tx.onabort = function () {
          db.close();
          reject(
            tx.error ||
            new Error("Operación cancelada.")
          );
        };

        try {
          result = executor(
            tx.objectStore(STORE_NAME)
          );
        } catch (error) {
          try {
            tx.abort();
          } catch (ignored) {}

          db.close();
          reject(error);
        }
      });
    });
  }

  function readFileRequest(makeRequest) {
    return openFilesDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(
          STORE_NAME,
          "readonly"
        );

        var value;

        tx.oncomplete = function () {
          db.close();
          resolve(value);
        };

        tx.onerror = function () {
          db.close();
          reject(
            tx.error ||
            new Error("Error al leer el archivo.")
          );
        };

        tx.onabort = function () {
          db.close();
          reject(
            tx.error ||
            new Error("Lectura cancelada.")
          );
        };

        try {
          var request = makeRequest(
            tx.objectStore(STORE_NAME)
          );

          request.onsuccess = function () {
            value = request.result;
          };
        } catch (error) {
          try {
            tx.abort();
          } catch (ignored) {}

          db.close();
          reject(error);
        }
      });
    });
  }

  function createId(prefix) {
    if (
      window.crypto &&
      window.crypto.randomUUID
    ) {
      return prefix + "-" +
        window.crypto.randomUUID();
    }

    return prefix + "-" +
      Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 9);
  }

  function putFile(file, fileId) {
    var record = {
      fileId: fileId || createId("file"),
      blob: file,
      name: file.name || "archivo",
      type: file.type || "application/octet-stream",
      size: file.size || 0,
      createdAt: new Date().toISOString()
    };

    return putFileRecord(record);
  }

  function putFileRecord(record) {
    return withStore("readwrite", function (store) {
      store.put(record);
      return record;
    });
  }

  function getFile(fileId) {
    if (!fileId) {
      return Promise.resolve(null);
    }

    return readFileRequest(function (store) {
      return store.get(fileId);
    }).then(function (record) {
      return record || null;
    });
  }

  function getAllFiles() {
    return readFileRequest(function (store) {
      return store.getAll();
    }).then(function (records) {
      return records || [];
    });
  }

  function deleteFile(fileId) {
    if (!fileId) {
      return Promise.resolve();
    }

    return withStore("readwrite", function (store) {
      store.delete(fileId);
    });
  }

  function clearFiles() {
    return withStore("readwrite", function (store) {
      store.clear();
    });
  }

  function extensionOf(name) {
    var pieces = String(name || "")
      .toLowerCase()
      .split(".");

    return pieces.length > 1
      ? pieces.pop()
      : "";
  }

  function validateFile(file, allowedExtensions) {
    var allowed = (
      allowedExtensions ||
      ["pdf", "docx", "xlsx", "jpg", "jpeg", "png"]
    ).map(function (x) {
      return String(x).toLowerCase();
    });

    if (!file || typeof file.name !== "string") {
      return {
        valid: false,
        message: "Seleccione un archivo."
      };
    }

    if (!file.size) {
      return {
        valid: false,
        message: "El archivo está vacío."
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        message: "El archivo supera los 10 MB."
      };
    }

    var extension = extensionOf(file.name);

    if (allowed.indexOf(extension) === -1) {
      return {
        valid: false,
        message: "Formato no permitido. Use " +
          allowed.join(", ").toUpperCase() + "."
      };
    }

    var dangerous = [
      "exe", "bat", "cmd", "com", "msi",
      "js", "vbs", "scr", "ps1", "sh", "jar"
    ];

    if (
      String(file.name)
        .toLowerCase()
        .split(".")
        .some(function (x) {
          return dangerous.indexOf(x) !== -1;
        })
    ) {
      return {
        valid: false,
        message: "Nombre de archivo potencialmente peligroso."
      };
    }

    var mimes = {
      pdf: ["application/pdf"],
      docx: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
        ""
      ],
      xlsx: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/octet-stream",
        ""
      ],
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      png: ["image/png"]
    };

    if (
      mimes[extension] &&
      mimes[extension].indexOf(file.type || "") === -1
    ) {
      return {
        valid: false,
        message: "El tipo del archivo no coincide con su extensión."
      };
    }

    return {
      valid: true,
      extension: extension
    };
  }

  function formatBytes(bytes) {
    var n = Number(bytes) || 0;

    if (!n) return "—";
    if (n < 1024) return n + " B";

    if (n < 1024 * 1024) {
      return (n / 1024).toFixed(1) + " KB";
    }

    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = name || "archivo";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        resolve(reader.result);
      };

      reader.onerror = function () {
        reject(reader.error);
      };

      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(",");
    var match = parts[0].match(/:(.*?);/);

    var binary = atob(parts[1] || "");
    var bytes = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], {
      type: match
        ? match[1]
        : "application/octet-stream"
    });
  }

  function exportBackup(state) {
    return getAllFiles().then(function (records) {
      return Promise.all(
        records.map(function (record) {
          return blobToDataUrl(record.blob)
            .then(function (dataUrl) {
              return {
                fileId: record.fileId,
                name: record.name,
                type: record.type,
                size: record.size,
                createdAt: record.createdAt,
                dataUrl: dataUrl
              };
            });
        })
      );
    }).then(function (files) {
      return {
        type: "SGAD_BACKUP",
        schemaVersion: 2,
        createdAt: new Date().toISOString(),
        state: clone(state),
        files: files
      };
    });
  }

  function restoreBackup(payload) {
    if (
      !payload ||
      payload.type !== "SGAD_BACKUP" ||
      Number(payload.schemaVersion) !== 2 ||
      !Array.isArray(payload.files)
    ) {
      return Promise.reject(
        new Error(
          "Respaldo SGAD inválido o incompatible."
        )
      );
    }

    var normalized;
    var records;

    try {
      normalized = normalizeState(payload.state);

      var ids = new Set();

      records = payload.files.map(function (item) {
        if (
          !item ||
          typeof item.fileId !== "string" ||
          !item.fileId ||
          ids.has(item.fileId) ||
          typeof item.dataUrl !== "string" ||
          !/^data:[^,]*;base64,/.test(item.dataUrl)
        ) {
          throw new Error(
            "Un archivo del respaldo está repetido o dañado."
          );
        }

        ids.add(item.fileId);

        var blob = dataUrlToBlob(item.dataUrl);

        if (
          typeof item.size === "number" &&
          item.size !== blob.size
        ) {
          throw new Error(
            "Tamaño incorrecto en archivo " +
            item.fileId
          );
        }

        return {
          fileId: item.fileId,
          blob: blob,
          name: item.name,
          type: item.type,
          size: blob.size,
          createdAt: item.createdAt
        };
      });
    } catch (error) {
      return Promise.reject(error);
    }

    // Rechaza la restauración si otra pestaña
    // guardó cambios después de la última lectura.
    if (
      localStorage.getItem(STATE_KEY) !==
      lastKnownRaw
    ) {
      return Promise.reject(
        new Error(
          "Otra pestaña cambió los datos. " +
          "Cierre las otras pestañas y recargue " +
          "antes de restaurar."
        )
      );
    }

    // IndexedDB y localStorage son almacenes distintos.
    // No existe una transacción única entre ambos;
    // por eso debe conservarse un respaldo externo.
    return clearFiles().then(function () {
      return Promise.all(
        records.map(putFileRecord)
      );
    }).then(function () {
      return saveState(normalized);
    });
  }

  window.SGADStorage = {
    STATE_KEY: STATE_KEY,
    SESSION_KEY: SESSION_KEY,
    clone: clone,
    loadState: loadState,
    saveState: saveState,
    resetState: resetState,
    getSession: getSession,
    setSession: setSession,
    createId: createId,
    putFile: putFile,
    getFile: getFile,
    getAllFiles: getAllFiles,
    deleteFile: deleteFile,
    clearFiles: clearFiles,
    validateFile: validateFile,
    formatBytes: formatBytes,
    downloadBlob: downloadBlob,
    exportBackup: exportBackup,
    restoreBackup: restoreBackup
  };
})();
