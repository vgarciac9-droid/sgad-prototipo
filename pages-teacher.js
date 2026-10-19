
(function () {
  "use strict";

  var App = window.SGADApp;

  // =====================================================
  // FUNCIONES GENERALES DEL PANEL DOCENTE
  // =====================================================

  function teacherPageHead(title, subtitle) {
    return '<div class="page-head"><div>' +
      '<p class="eyebrow">Espacio docente</p>' +
      '<h1>' + App.escape(title) + '</h1>' +
      '<p>' + App.escape(subtitle) + '</p>' +
      '</div></div>';
  }

  function teacherMetric(label, value, subtitle, target, icon) {
    return '<article class="metric">' +
      '<div class="metric-head"><div>' +
      '<div class="metric-label">' + App.escape(label) + '</div>' +
      '<div class="metric-value">' + App.escape(value) + '</div>' +
      '</div><span class="metric-icon">' + icon + '</span></div>' +
      '<div class="metric-sub">' + App.escape(subtitle) + '</div>' +
      '<div class="metric-foot"><span>Información actualizada</span>' +
      '<button class="link-button" data-action="navigate" data-view="' +
      target + '">Ver →</button></div></article>';
  }

  function teacherRequests(userId) {
    return App.state.deliveryRequests.filter(function (request) {
      return request.cycleId === App.state.settings.selectedCycleId &&
        Array.isArray(request.targetUserIds) &&
        request.targetUserIds.indexOf(userId) !== -1;
    });
  }

  function teacherSubmissions(userId) {
    return App.state.submissions.filter(function (submission) {
      var request = App.state.deliveryRequests.find(function (item) {
        return item.id === submission.requestId;
      });

      return submission.teacherId === userId &&
        request &&
        request.cycleId === App.state.settings.selectedCycleId;
    });
  }

  function requestIsWritable(request) {
    var active = App.activeCycle();
    var cycle = request && App.cycleById(request.cycleId);

    return !!(
      request &&
      cycle &&
      active &&
      request.status === "Vigente" &&
      cycle.status === "Activo" &&
      cycle.id === active.id
    );
  }

  function canTeacherSubmit(request, user, submission) {
    return !!(
      user &&
      user.active &&
      user.permissions &&
      user.permissions.viewRequests &&
      user.permissions.submitDeliveries &&
      request &&
      Array.isArray(request.targetUserIds) &&
      request.targetUserIds.indexOf(user.id) !== -1 &&
      requestIsWritable(request) &&
      (!submission ||
        submission.status === "Corrección solicitada")
    );
  }

  function findTeacherSubmission(requestId, userId) {
    return App.state.submissions.find(function (submission) {
      return submission.requestId === requestId &&
        submission.teacherId === userId;
    });
  }

  function studentRows(items) {
    return items.map(function (enrollment) {
      var student = App.studentById(enrollment.studentId);
      var section = App.sectionById(enrollment.sectionId);

      if (!student || !section) return "";

      var status = App.studentFileStatus(
        student.id,
        enrollment.cycleId
      );

      return '<tr>' +
        '<td><div class="cell-title">' +
        App.escape(student.firstNames + " " + student.lastNames) +
        '</div><div class="cell-sub">' +
        App.escape(student.code) + '</div></td>' +
        '<td>' + App.escape(section.label) + '</td>' +
        '<td>' + App.statusBadge(
          status.complete ? "Completo" : "Incompleto"
        ) + '</td>' +
        '<td><button class="btn btn-soft btn-sm" ' +
        'data-action="teacher-view-student" data-id="' +
        App.escape(student.id) + '">Consultar</button></td>' +
        '</tr>';
    }).join("");
  }

  // =====================================================
  // PANEL PRINCIPAL DOCENTE
  // =====================================================

  App.pages["teacher-dashboard"] = function () {
    var user = App.currentUser();
    var cycle = App.selectedCycle();

    var sections = App.teacherSections(user.id, cycle.id);

    var sectionIds = new Set(
      sections.map(function (section) {
        return section.id;
      })
    );

    var students = App.state.enrollments.filter(function (item) {
      return item.cycleId === cycle.id &&
        sectionIds.has(item.sectionId) &&
        item.status !== "Retirada";
    });

    var requests = teacherRequests(user.id);
    var submissions = teacherSubmissions(user.id);

    var pending = requests.filter(function (request) {
      var submission = findTeacherSubmission(request.id, user.id);

      return canTeacherSubmit(request, user, submission);
    });

    var approved = submissions.filter(function (item) {
      return item.status === "Aprobado";
    }).length;

    var corrections = submissions.filter(function (item) {
      return item.status === "Corrección solicitada";
    }).length;

    var pendingList = pending.slice(0, 5).map(function (request) {
      return '<li class="list-item">' +
        '<span class="list-icon">◷</span>' +
        '<div class="list-main"><strong>' +
        App.escape(request.title) +
        '</strong><small>Vence ' +
        App.formatDate(request.dueDate) +
        ' · ' +
        App.escape((request.allowedFormats || []).join(", ")) +
        '</small></div>' +
        '<button class="btn btn-soft btn-sm" ' +
        'data-action="open-teacher-request" data-id="' +
        App.escape(request.id) + '">Abrir</button></li>';
    }).join("");

    var sectionList = sections.map(function (section) {
      var total = students.filter(function (item) {
        return item.sectionId === section.id;
      }).length;

      return '<li class="list-item">' +
        '<span class="list-icon">▱</span>' +
        '<div class="list-main"><strong>' +
        App.escape(section.label) +
        '</strong><small>' + total +
        ' estudiantes asignados</small></div></li>';
    }).join("");

    return '<div class="page teacher-dashboard">' +
      '<section class="hero"><div>' +
      '<p class="eyebrow">Panel docente · ciclo ' +
      App.escape(cycle.year) + '</p>' +
      '<h1>Hola, ' +
      App.escape(user.name.split(" ")[0]) + '</h1>' +
      '<p>Secciones asignadas: ' +
      App.escape(
        sections.map(function (item) {
          return item.label;
        }).join(" y ") || "Sin sección"
      ) + '.</p></div>' +
      '<button class="btn" data-action="navigate" ' +
      'data-view="teacher-requests">Ver entregas</button>' +
      '</section>' +

      '<section class="metrics">' +
      teacherMetric(
        "Mis estudiantes",
        students.length,
        "Asignados a mis secciones",
        "teacher-students",
        "◎"
      ) +
      teacherMetric(
        "Solicitudes pendientes",
        pending.length,
        "Requieren una entrega",
        "teacher-requests",
        "◷"
      ) +
      teacherMetric(
        "Documentos aprobados",
        approved,
        "Revisados por Dirección",
        "teacher-documents",
        "✓"
      ) +
      teacherMetric(
        "Correcciones",
        corrections,
        "Necesitan una nueva versión",
        "teacher-corrections",
        "↻"
      ) +
      '</section>' +

      '<section class="grid-2">' +
      '<article class="card"><div class="card-head"><div>' +
      '<h2 class="card-title">Próximas entregas</h2>' +
      '<p class="card-subtitle">Solicitudes activas que requieren atención</p>' +
      '</div></div><ul class="list">' +
      (pendingList ||
        '<li>' + App.empty(
          "Todo al día",
          "No tiene entregas pendientes."
        ) + '</li>') +
      '</ul></article>' +

      '<article class="card"><div class="card-head"><div>' +
      '<h2 class="card-title">Mis secciones</h2>' +
      '<p class="card-subtitle">Responsabilidades del ciclo seleccionado</p>' +
      '</div></div><ul class="list">' +
      (sectionList ||
        '<li>' + App.empty(
          "Sin asignación",
          "Dirección todavía no le asignó una sección."
        ) + '</li>') +
      '</ul></article></section></div>';
  };

  // =====================================================
  // MIS ESTUDIANTES
  // =====================================================

  App.pages["teacher-students"] = function () {
    var user = App.currentUser();

    if (!user.permissions || !user.permissions.viewStudents) {
      return '<div class="page">' +
        App.empty(
          "Acceso restringido",
          "No tiene permiso para consultar estudiantes."
        ) + '</div>';
    }

    var cycleId = App.state.settings.selectedCycleId;
    var sections = App.teacherSections(user.id, cycleId);

    var sectionIds = new Set(
      sections.map(function (item) {
        return item.id;
      })
    );

    var enrollments = App.state.enrollments.filter(
      function (item) {
        return item.cycleId === cycleId &&
          sectionIds.has(item.sectionId) &&
          item.status !== "Retirada";
      }
    );

    return '<div class="page">' +
      teacherPageHead(
        "Mis estudiantes",
        "Información de las secciones que tiene asignadas."
      ) +

      '<div class="toolbar">' +
      '<input class="input" id="teacher-student-search" ' +
      'placeholder="Buscar por nombre o código...">' +

      '<select class="input" id="teacher-student-section">' +
      '<option value="">Todas mis secciones</option>' +
      App.formOptions(sections, "id", "label") +
      '</select>' +

      '<select class="input" id="teacher-student-status">' +
      '<option value="">Todos los expedientes</option>' +
      '<option value="complete">Completos</option>' +
      '<option value="incomplete">Incompletos</option>' +
      '</select></div>' +

      '<div class="table-card"><div class="table-wrap">' +
      '<table><thead><tr>' +
      '<th>Estudiante</th><th>Sección</th>' +
      '<th>Expediente</th><th>Acción</th>' +
      '</tr></thead>' +
      '<tbody id="teacher-student-rows">' +
      (studentRows(enrollments) ||
        '<tr><td colspan="4">' +
        App.empty(
          "Sin estudiantes",
          "No hay estudiantes en sus secciones."
        ) +
        '</td></tr>') +
      '</tbody></table></div></div></div>';
  };

  App.pageMounted["teacher-students"] = function () {
    [
      "teacher-student-search",
      "teacher-student-section",
      "teacher-student-status"
    ].forEach(function (id) {
      var control = document.getElementById(id);

      if (control) {
        control.addEventListener("input", filterTeacherStudents);
      }
    });
  };

  function filterTeacherStudents() {
    var user = App.currentUser();
    var cycleId = App.state.settings.selectedCycleId;

    var allowedSections = new Set(
      App.teacherSections(user.id, cycleId).map(
        function (section) {
          return section.id;
        }
      )
    );

    var search = App.normalizeSearch(
      document.getElementById("teacher-student-search").value
    );

    var sectionId = document.getElementById(
      "teacher-student-section"
    ).value;

    var statusFilter = document.getElementById(
      "teacher-student-status"
    ).value;

    var filtered = App.state.enrollments.filter(
      function (enrollment) {
        if (
          enrollment.cycleId !== cycleId ||
          enrollment.status === "Retirada" ||
          !allowedSections.has(enrollment.sectionId)
        ) {
          return false;
        }

        var student = App.studentById(enrollment.studentId);

        if (!student) return false;

        var haystack = App.normalizeSearch(
          student.firstNames + " " +
          student.lastNames + " " +
          student.code
        );

        var status = App.studentFileStatus(
          student.id,
          cycleId
        );

        return (!search || haystack.includes(search)) &&
          (!sectionId || enrollment.sectionId === sectionId) &&
          (!statusFilter ||
            (statusFilter === "complete"
              ? status.complete
              : !status.complete));
      }
    );

    document.getElementById(
      "teacher-student-rows"
    ).innerHTML = filtered.length
      ? studentRows(filtered)
      : '<tr><td colspan="4">' +
        App.empty(
          "Sin coincidencias",
          "Cambie los filtros para consultar otros estudiantes."
        ) + '</td></tr>';
  }

  // =====================================================
  // CONSULTA DE EXPEDIENTE DOCENTE
  // =====================================================

  App.actions["teacher-view-student"] = function (element) {
    var user = App.currentUser();
    var studentId = element.dataset.id;
    var cycleId = App.state.settings.selectedCycleId;

    var enrollment = App.studentEnrollment(studentId, cycleId);

    var allowed = enrollment &&
      App.teacherSections(user.id, cycleId).some(
        function (section) {
          return section.id === enrollment.sectionId;
        }
      );

    if (
      !allowed ||
      !user.permissions ||
      !user.permissions.viewStudents ||
      !user.permissions.viewFiles
    ) {
      App.toast(
        "No tiene permiso para consultar este expediente.",
        "error"
      );
      return;
    }

    var student = App.studentById(studentId);

    if (!student) {
      App.toast("Estudiante no encontrado.", "error");
      return;
    }

    var status = App.studentFileStatus(studentId, cycleId);

    var requirements = App.state.requirements.filter(
      function (item) {
        return item.active;
      }
    ).map(function (requirement) {
      var doc = App.state.studentDocuments.find(
        function (item) {
          return item.studentId === studentId &&
            item.cycleId === cycleId &&
            item.requirementId === requirement.id &&
            item.status !== "Eliminado";
        }
      );

      return '<div class="requirement">' +
        '<span class="requirement-state ' +
        (doc ? "ok" : "missing") + '">' +
        (doc ? "✓" : "!") + '</span>' +

        '<div class="requirement-info"><strong>' +
        App.escape(requirement.name) +
        '</strong><small>' +
        (doc ? "Documento entregado" : "Documento pendiente") +
        '</small></div>' +

        (doc && user.permissions.downloadDocuments
          ? '<button class="btn btn-secondary btn-sm" ' +
            'data-action="download-file" ' +
            'data-collection="studentDocuments" ' +
            'data-module="Expedientes" data-id="' +
            App.escape(doc.id) + '">Descargar</button>'
          : "") +
        '</div>';
    }).join("");

    App.openModal({
      size: "lg",
      eyebrow: "Consulta de expediente",
      title: student.firstNames + " " + student.lastNames,
      body:
        '<div class="alert alert-info">' +
        '<span>i</span><div>Vista docente de solo consulta. ' +
        'Estado: <strong>' +
        (status.complete ? "Completo" : "Incompleto") +
        '</strong>.</div></div>' +
        '<div class="requirement-list mt-20">' +
        requirements + '</div>',
      footer:
        '<button class="btn btn-primary" ' +
        'data-action="close-modal">Cerrar</button>'
    });
  };

  // =====================================================
  // HISTORIAL DE VERSIONES
  // =====================================================

  function teacherVersionHistory(submission) {
    var versions = Array.isArray(submission.versions)
      ? submission.versions
      : [];

    if (!versions.length) {
      return '<p class="muted mt-20">' +
        'No hay versiones anteriores.</p>';
    }

    return '<h3 class="card-title mt-20">' +
      'Versiones anteriores</h3><ul class="list">' +

      versions.slice().reverse().map(function (version) {
        return '<li class="list-item">' +
          '<div class="list-main">' +
          '<strong>Versión ' +
          App.escape(version.version) +
          '</strong><small>' +
          App.escape(version.fileName || "Sin archivo") +
          ' · ' +
          App.formatDate(version.replacedAt, true) +
          '</small></div>' +

          (version.fileId
            ? '<button class="btn btn-secondary btn-sm" ' +
              'data-action="teacher-download-version" ' +
              'data-id="' + App.escape(submission.id) + '" ' +
              'data-file-id="' + App.escape(version.fileId) +
              '">Descargar</button>'
            : '<span class="muted">No disponible</span>') +

          '</li>';
      }).join("") +
      '</ul>';
  }

  // =====================================================
  // ENTREGAS SOLICITADAS
  // =====================================================

  App.pages["teacher-requests"] = function () {
    var user = App.currentUser();

    if (!user.permissions || !user.permissions.viewRequests) {
      return '<div class="page">' +
        App.empty(
          "Acceso restringido",
          "No tiene permiso para consultar solicitudes."
        ) + '</div>';
    }

    var requests = teacherRequests(user.id).slice().sort(
      function (a, b) {
        return String(a.dueDate).localeCompare(
          String(b.dueDate)
        );
      }
    );

    var cards = requests.map(function (request) {
      var submission = findTeacherSubmission(
        request.id,
        user.id
      );

      var canSubmit = canTeacherSubmit(
        request,
        user,
        submission
      );

      var status = submission
        ? submission.status
        : !requestIsWritable(request)
          ? "Cerrada"
          : request.dueDate < App.todayIso()
            ? "Vencido"
            : "Pendiente";

      var buttonText = !canSubmit
        ? (submission ? "Ver entrega" : "Ver solicitud")
        : submission
          ? "Corregir"
          : "Entregar";

      return '<article class="card">' +
        '<div class="card-head"><div>' +
        '<h2 class="card-title">' +
        App.escape(request.title) +
        '</h2><p class="card-subtitle">Vence ' +
        App.formatDate(request.dueDate) +
        '</p></div>' +
        App.statusBadge(status) +
        '</div>' +

        '<p>' + App.escape(request.description) + '</p>' +

        '<div class="section-foot">' +
        '<span>Formatos: ' +
        App.escape(
          (request.allowedFormats || []).join(", ")
        ) + '</span>' +

        '<button class="btn btn-primary btn-sm" ' +
        'data-action="open-teacher-request" data-id="' +
        App.escape(request.id) + '">' +
        buttonText +
        '</button></div></article>';
    }).join("");

    return '<div class="page">' +
      teacherPageHead(
        "Entregas solicitadas",
        "Documentos requeridos por Dirección en el ciclo seleccionado."
      ) +
      '<section class="teacher-request-list">' +
      (cards || App.empty(
        "Sin solicitudes",
        "No tiene solicitudes dirigidas a su cuenta."
      )) +
      '</section></div>';
  };

  // =====================================================
  // ABRIR SOLICITUD
  // =====================================================

  App.actions["open-teacher-request"] = function (element) {
    var user = App.currentUser();

    var request = App.state.deliveryRequests.find(
      function (item) {
        return item.id === element.dataset.id;
      }
    );

    if (
      !user ||
      !user.permissions ||
      !user.permissions.viewRequests ||
      !request ||
      request.cycleId !== App.state.settings.selectedCycleId ||
      !request.targetUserIds.includes(user.id)
    ) {
      App.toast(
        "No tiene acceso a esta solicitud.",
        "error"
      );
      return;
    }

    var submission = findTeacherSubmission(
      request.id,
      user.id
    );

    var canSubmit = canTeacherSubmit(
      request,
      user,
      submission
    );

    var status = submission
      ? submission.status
      : requestIsWritable(request)
        ? "Pendiente"
        : "Cerrada";

    var body =
      '<div class="detail-grid">' +

      '<div class="detail-item">' +
      '<label>Fecha límite</label><strong>' +
      App.formatDate(request.dueDate) +
      '</strong></div>' +

      '<div class="detail-item">' +
      '<label>Prioridad</label><strong>' +
      App.escape(request.priority) +
      '</strong></div>' +

      '<div class="detail-item">' +
      '<label>Formatos permitidos</label><strong>' +
      App.escape(
        (request.allowedFormats || []).join(", ")
      ) +
      '</strong></div>' +

      '<div class="detail-item">' +
      '<label>Estado</label><strong>' +
      App.escape(status) +
      '</strong></div>' +

      '</div>' +

      '<p class="mt-20">' +
      App.escape(request.description) +
      '</p>' +

      (submission && submission.correctionReason
        ? '<div class="alert alert-warning mt-20">' +
          '<span>⚠</span><div>' +
          '<strong>Observaciones:</strong> ' +
          App.escape(submission.correctionReason) +
          '</div></div>'
        : "") +

      (submission
        ? '<div class="alert alert-info mt-20">' +
          '<span>▤</span><div>Archivo entregado: ' +
          '<strong>' +
          App.escape(submission.fileName || "—") +
          '</strong> · v' +
          App.escape(submission.version) +
          '</div></div>' +
          teacherVersionHistory(submission)
        : "") +

      (canSubmit
        ? '<form id="teacher-submit-form" class="mt-20">' +
          '<div class="form-group">' +
          '<label class="required">Seleccione el archivo</label>' +
          '<input class="input" name="file" type="file" required>' +
          '</div>' +
          '<div class="form-group">' +
          '<label>Observaciones</label>' +
          '<textarea class="input" name="notes"></textarea>' +
          '</div></form>'
        : "");

    var footer =
      '<button class="btn btn-secondary" ' +
      'data-action="close-modal">Cerrar</button>' +

      (submission
        ? '<button class="btn btn-soft" ' +
          'data-action="preview-file" ' +
          'data-collection="submissions" ' +
          'data-module="Entregas" data-id="' +
          App.escape(submission.id) +
          '">Ver archivo</button>' +

          (user.permissions.downloadDocuments
            ? '<button class="btn btn-secondary" ' +
              'data-action="download-file" ' +
              'data-collection="submissions" ' +
              'data-module="Entregas" data-id="' +
              App.escape(submission.id) +
              '">Descargar</button>'
            : "")
        : "") +

      (canSubmit
        ? '<button class="btn btn-primary" ' +
          'data-action="save-teacher-submission" data-id="' +
          App.escape(request.id) + '">' +
          (submission
            ? "Enviar corrección"
            : "Realizar entrega") +
          '</button>'
        : "");

    App.openModal({
      size: "lg",
      eyebrow: "Solicitud de Dirección",
      title: request.title,
      body: body,
      footer: footer
    });
  };

  // =====================================================
  // DESCARGAR VERSIÓN ANTERIOR
  // =====================================================

  App.actions["teacher-download-version"] = function (element) {
    var user = App.currentUser();

    var submission = App.state.submissions.find(
      function (item) {
        return user &&
          item.id === element.dataset.id &&
          item.teacherId === user.id;
      }
    );

    if (
      !submission ||
      !user.permissions ||
      !user.permissions.viewRequests ||
      !user.permissions.downloadDocuments
    ) {
      App.toast(
        "No tiene permiso para descargar esta versión.",
        "error"
      );
      return;
    }

    var version = (submission.versions || []).find(
      function (item) {
        return item.fileId === element.dataset.fileId;
      }
    );

    if (!version || !version.fileId) return;

    return window.SGADStorage.getFile(
      version.fileId
    ).then(function (record) {
      if (!record || !record.blob) {
        throw new Error(
          "La versión anterior no está disponible."
        );
      }

      window.SGADStorage.downloadBlob(
        record.blob,
        record.name || version.fileName
      );

      App.audit(
        "Descargó versión anterior",
        "Entregas",
        submission.code,
        version.fileName || "Versión anterior"
      );
    });
  };

  // =====================================================
  // GUARDAR ENTREGA O CORRECCIÓN
  // =====================================================

  App.actions["save-teacher-submission"] = function (element) {
    var user = App.currentUser();

    var request = App.state.deliveryRequests.find(
      function (item) {
        return item.id === element.dataset.id;
      }
    );

    var existing = request && user
      ? findTeacherSubmission(request.id, user.id)
      : null;

    if (
      !request ||
      !user ||
      request.cycleId !== App.state.settings.selectedCycleId ||
      !canTeacherSubmit(request, user, existing)
    ) {
      App.toast(
        "Esta solicitud ya no permite nuevas entregas.",
        "warning"
      );
      return;
    }

    var form = document.getElementById(
      "teacher-submit-form"
    );

    if (!form || !form.reportValidity()) return;

    var data = new FormData(form);
    var file = data.get("file");

    var allowed = (request.allowedFormats || []).reduce(
      function (list, item) {
        var value = String(item).toLowerCase();

        return value === "png"
          ? list.concat(["png", "jpg", "jpeg"])
          : list.concat(value);
      },
      []
    );

    var validation = window.SGADStorage.validateFile(
      file,
      allowed
    );

    if (!validation.valid) {
      App.toast(validation.message, "error");
      return;
    }

    var button = document.querySelector(
      '[data-action="save-teacher-submission"]'
    );

    if (button) button.disabled = true;

    return window.SGADStorage.putFile(file)
      .then(function (record) {
        var current = findTeacherSubmission(
          request.id,
          user.id
        );

        // Verificar de nuevo después de guardar el
        // archivo, por si cambió la solicitud.
        if (!canTeacherSubmit(request, user, current)) {
          return window.SGADStorage.deleteFile(
            record.fileId
          ).then(function () {
            throw new Error(
              "La solicitud cambió mientras se guardaba."
            );
          });
        }

        var previousState = window.SGADStorage.clone(
          App.state
        );

        try {
          var submission;

          if (current) {
            submission = current;

            if (!Array.isArray(submission.versions)) {
              submission.versions = [];
            }

            submission.versions.push({
              version: submission.version,
              fileId: submission.fileId,
              fileName: submission.fileName,
              mimeType: submission.mimeType,
              fileSize: submission.fileSize,
              replacedAt: App.nowIso(),
              reason: "Corrección enviada por docente"
            });

            submission.version += 1;
            submission.fileId = record.fileId;
            submission.fileName = record.name;
            submission.mimeType = record.type;
            submission.fileSize = record.size;
            submission.status = "Entregado nuevamente";
            submission.submittedAt = App.nowIso();
            submission.notes = String(
              data.get("notes") || ""
            );
            submission.correctionReason = "";

          } else {
            var cycle = App.cycleById(request.cycleId);

            var numbers = App.state.submissions.map(
              function (item) {
                var match = String(item.code || "")
                  .match(/^ENT-\d{4}-(\d+)$/);

                return match ? Number(match[1]) : 0;
              }
            );

            var number = Math.max.apply(
              null,
              [0].concat(numbers)
            ) + 1;

            submission = {
              id: window.SGADStorage.createId("sub"),
              code: "ENT-" + cycle.year + "-" +
                String(number).padStart(3, "0"),
              requestId: request.id,
              teacherId: user.id,
              fileId: record.fileId,
              fileName: record.name,
              mimeType: record.type,
              fileSize: record.size,
              version: 1,
              versions: [],
              status: "Recibido",
              submittedAt: App.nowIso(),
              reviewedAt: null,
              reviewedBy: null,
              correctionReason: "",
              notes: String(data.get("notes") || "")
            };

            App.state.submissions.push(submission);
          }

          App.state.notifications.unshift({
            id: window.SGADStorage.createId("not"),
            userId: "usr-dir",
            title: "Nueva entrega recibida",
            message: user.name + " entregó " +
              request.title + ".",
            type: "submission",
            relatedId: submission.id,
            targetView: "reviews",
            read: false,
            createdAt: App.nowIso()
          });

          App.audit(
            submission.version > 1
              ? "Envió corrección"
              : "Subió entrega",
            "Entregas",
            submission.code,
            request.title + " · " + record.name
          );

          App.closeModal();
          App.currentView = "teacher-receipts";
          App.renderShell();

          App.toast(
            "Entrega registrada. Comprobante " +
              submission.code + ".",
            "success"
          );

        } catch (error) {
          App.state = previousState;

          return window.SGADStorage.deleteFile(
            record.fileId
          ).then(function () {
            throw error;
          });
        }
      })
      .catch(function (error) {
        App.toast(
          error.message ||
            "No fue posible guardar la entrega.",
          "error"
        );

        if (button && button.isConnected) {
          button.disabled = false;
        }
      });
  };

  // =====================================================
  // MIS DOCUMENTOS
  // =====================================================

  function submissionRows(items) {
    var user = App.currentUser();

    return items.map(function (submission) {
      var request = App.state.deliveryRequests.find(
        function (item) {
          return item.id === submission.requestId;
        }
      );

      return '<tr>' +
        '<td><div class="cell-title">' +
        App.escape(
          request ? request.title : "Solicitud no disponible"
        ) +
        '</div><div class="cell-sub">' +
        App.escape(submission.code) +
        '</div></td>' +

        '<td>' +
        App.formatDate(submission.submittedAt, true) +
        '</td>' +

        '<td>v' + App.escape(submission.version) + '</td>' +
        '<td>' + App.statusBadge(submission.status) + '</td>' +

        '<td><div class="table-actions">' +
        '<button class="btn btn-soft btn-sm" ' +
        'data-action="open-teacher-request" data-id="' +
        App.escape(submission.requestId) +
        '">Ver detalle</button>' +

        (user.permissions.downloadDocuments
          ? '<button class="btn btn-secondary btn-sm" ' +
            'data-action="download-file" ' +
            'data-collection="submissions" ' +
            'data-module="Entregas" data-id="' +
            App.escape(submission.id) +
            '">Descargar</button>'
          : "") +
        '</div></td></tr>';
    }).join("");
  }

  App.pages["teacher-documents"] = function () {
    var user = App.currentUser();

    if (!user.permissions ||
        !user.permissions.viewRequests) {
      return '<div class="page">' +
        App.empty(
          "Acceso restringido",
          "No tiene permiso para consultar sus documentos."
        ) + '</div>';
    }

    var items = teacherSubmissions(user.id);

    return '<div class="page">' +
      teacherPageHead(
        "Mis documentos",
        "Archivos entregados, versiones y estado de revisión."
      ) +

      '<div class="table-card"><div class="table-wrap">' +
      '<table><thead><tr>' +
      '<th>Documento</th>' +
      '<th>Fecha</th>' +
      '<th>Versión</th>' +
      '<th>Estado</th>' +
      '<th>Acciones</th>' +
      '</tr></thead><tbody>' +

      (submissionRows(items) ||
        '<tr><td colspan="5">' +
        App.empty(
          "Sin documentos",
          "Todavía no ha realizado entregas."
        ) +
        '</td></tr>') +

      '</tbody></table></div></div></div>';
  };

  // =====================================================
  // CORRECCIONES SOLICITADAS
  // =====================================================

  App.pages["teacher-corrections"] = function () {
    var user = App.currentUser();

    if (!user.permissions ||
        !user.permissions.viewRequests) {
      return '<div class="page">' +
        App.empty(
          "Acceso restringido",
          "No tiene permiso para consultar correcciones."
        ) + '</div>';
    }

    var items = teacherSubmissions(user.id).filter(
      function (submission) {
        return submission.status === "Corrección solicitada";
      }
    );

    var cards = items.map(function (submission) {
      var request = App.state.deliveryRequests.find(
        function (item) {
          return item.id === submission.requestId;
        }
      );

      var canSubmit = canTeacherSubmit(
        request,
        user,
        submission
      );

      return '<article class="card">' +
        '<div class="card-head"><div>' +
        '<h2 class="card-title">' +
        App.escape(
          request ? request.title : submission.code
        ) +
        '</h2><p class="card-subtitle">' +
        App.escape(submission.code) +
        '</p></div>' +
        App.statusBadge(submission.status) +
        '</div>' +

        '<div class="alert alert-warning">' +
        '<span>⚠</span><div>' +
        App.escape(submission.correctionReason || "Sin observaciones") +
        '</div></div>' +

        '<button class="btn btn-primary mt-20" ' +
        'data-action="open-teacher-request" data-id="' +
        App.escape(submission.requestId) + '">' +
        (canSubmit
          ? "Enviar nueva versión"
          : "Ver observaciones") +
        '</button></article>';
    }).join("");

    return '<div class="page">' +
      teacherPageHead(
        "Correcciones",
        "Revise las observaciones de Dirección y envíe una nueva versión cuando la solicitud esté vigente."
      ) +

      '<section class="grid-2">' +
      (cards || App.empty(
        "Sin correcciones",
        "Dirección no ha solicitado cambios pendientes."
      )) +
      '</section></div>';
  };

  // =====================================================
  // MIS COMPROBANTES
  // =====================================================

  App.pages["teacher-receipts"] = function () {
    var user = App.currentUser();

    if (!user.permissions ||
        !user.permissions.viewReceipts) {
      return '<div class="page">' +
        App.empty(
          "Acceso restringido",
          "No tiene permiso para consultar comprobantes."
        ) + '</div>';
    }

    var items = teacherSubmissions(user.id);

    var rows = items.map(function (submission) {
      var request = App.state.deliveryRequests.find(
        function (item) {
          return item.id === submission.requestId;
        }
      );

      return '<tr>' +
        '<td><strong>' +
        App.escape(submission.code) +
        '</strong></td>' +

        '<td>' +
        App.escape(request ? request.title : "—") +
        '</td>' +

        '<td>' +
        App.formatDate(submission.submittedAt, true) +
        '</td>' +

        '<td>' +
        App.statusBadge(submission.status) +
        '</td>' +

        '<td><button class="btn btn-soft btn-sm" ' +
        'data-action="view-receipt" data-id="' +
        App.escape(submission.id) +
        '">Ver / imprimir</button></td></tr>';
    }).join("");

    return '<div class="page">' +
      teacherPageHead(
        "Mis comprobantes",
        "Constancias generadas al realizar una entrega."
      ) +

      '<div class="table-card"><div class="table-wrap">' +
      '<table><thead><tr>' +
      '<th>Código</th>' +
      '<th>Solicitud</th>' +
      '<th>Fecha</th>' +
      '<th>Estado</th>' +
      '<th>Comprobante</th>' +
      '</tr></thead><tbody>' +

      (rows ||
        '<tr><td colspan="5">' +
        App.empty(
          "Sin comprobantes",
          "Los comprobantes aparecerán después de realizar una entrega."
        ) +
        '</td></tr>') +

      '</tbody></table></div></div></div>';
  };

  // =====================================================
  // VER COMPROBANTE
  // =====================================================

  App.actions["view-receipt"] = function (element) {
    var user = App.currentUser();

    if (!user ||
        !user.permissions ||
        !user.permissions.viewReceipts) {
      App.toast(
        "No tiene permiso para ver comprobantes.",
        "error"
      );
      return;
    }

    var submission = App.state.submissions.find(
      function (item) {
        return item.id === element.dataset.id &&
          item.teacherId === user.id;
      }
    );

    if (!submission) return;

    var request = App.state.deliveryRequests.find(
      function (item) {
        return item.id === submission.requestId;
      }
    );

    App.openModal({
      size: "sm",
      eyebrow: "Comprobante de entrega",
      title: submission.code,

      body:
        '<div class="report-heading">' +
        '<img src="assets/logo-escuela.png" alt="Logo">' +
        '<div><h2>SGAD</h2>' +
        '<p>EORM Orfelinda Osorio Lemus</p>' +
        '</div></div>' +

        '<div class="detail-grid">' +

        '<div class="detail-item"><label>Docente</label>' +
        '<strong>' +
        App.escape(user.name) +
        '</strong></div>' +

        '<div class="detail-item"><label>Solicitud</label>' +
        '<strong>' +
        App.escape(request ? request.title : "—") +
        '</strong></div>' +

        '<div class="detail-item"><label>Fecha y hora</label>' +
        '<strong>' +
        App.formatDate(submission.submittedAt, true) +
        '</strong></div>' +

        '<div class="detail-item"><label>Archivo</label>' +
        '<strong>' +
        App.escape(submission.fileName || "—") +
        '</strong></div>' +

        '<div class="detail-item"><label>Versión</label>' +
        '<strong>v' +
        App.escape(submission.version) +
        '</strong></div>' +

        '<div class="detail-item"><label>Estado</label>' +
        '<strong>' +
        App.escape(submission.status) +
        '</strong></div>' +

        '</div>',

      footer:
        '<button class="btn btn-secondary" ' +
        'data-action="close-modal">Cerrar</button>' +
        '<button class="btn btn-primary" ' +
        'data-action="print-receipt">' +
        'Imprimir / Guardar PDF</button>'
    });
  };

  App.actions["print-receipt"] = function () {
    var user = App.currentUser();

    if (!user || !user.permissions ||
        !user.permissions.viewReceipts) {
      App.toast("No tiene permiso para imprimir.", "error");
      return;
    }

    window.print();
  };

})();
