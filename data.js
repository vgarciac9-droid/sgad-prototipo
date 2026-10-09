(function () {
  "use strict";

  var teacherPermissions = {
    viewStudents: true,
    viewFiles: true,
    uploadStudentDocuments: false,
    updateStudentDocuments: false,
    viewRequests: true,
    submitDeliveries: true,
    downloadDocuments: true,
    viewReceipts: true
  };

  function user(id, name, email, role, initials) {
    return {
      id: id,
      name: name,
      email: email,
      role: role,
      initials: initials,
      active: true,
      permissions: role === "directora" ? { all: true } : Object.assign({}, teacherPermissions),
      createdAt: "2026-01-05T08:00:00"
    };
  }

  function section(id, cycleId, grade, label, teacherId) {
    return { id: id, cycleId: cycleId, grade: grade, label: label, teacherId: teacherId, active: true };
  }

  function student(id, code, firstNames, lastNames, cui, birthDate, gender, guardian, phone, address) {
    return {
      id: id,
      code: code,
      firstNames: firstNames,
      lastNames: lastNames,
      cui: cui,
      birthDate: birthDate,
      gender: gender,
      guardian: guardian,
      relationship: "Madre",
      phone: phone,
      address: address,
      createdAt: "2026-01-08T08:30:00"
    };
  }

  function createDefaultState() {
    var users = [
      user("usr-dir", "María Eugenia Morales Soto", "directora@sgad.demo", "directora", "ME"),
      user("usr-car", "Carlos Rolando Hernández Gómez", "carlos@sgad.demo", "docente", "CH"),
      user("usr-ana", "Ana Patricia Ruiz Alvarado", "ana@sgad.demo", "docente", "AR"),
      user("usr-mar", "Mario Leonel Méndez Castillo", "mario@sgad.demo", "docente", "MM"),
      user("usr-jul", "Julia Amanda López Morales", "julia@sgad.demo", "docente", "JL")
    ];

    var sections = [
      section("sec-2026-1", "cy-2026", 1, "Primero A", "usr-car"),
      section("sec-2026-2", "cy-2026", 2, "Segundo A", "usr-ana"),
      section("sec-2026-3", "cy-2026", 3, "Tercero A", "usr-mar"),
      section("sec-2026-4", "cy-2026", 4, "Cuarto A", "usr-jul"),
      section("sec-2026-5", "cy-2026", 5, "Quinto A", "usr-ana"),
      section("sec-2026-6", "cy-2026", 6, "Sexto A", "usr-mar"),
      section("sec-2025-1", "cy-2025", 1, "Primero A", "usr-car"),
      section("sec-2025-2", "cy-2025", 2, "Segundo A", "usr-ana"),
      section("sec-2025-3", "cy-2025", 3, "Tercero A", "usr-mar"),
      section("sec-2025-4", "cy-2025", 4, "Cuarto A", "usr-jul"),
      section("sec-2025-5", "cy-2025", 5, "Quinto A", "usr-ana"),
      section("sec-2025-6", "cy-2025", 6, "Sexto A", "usr-mar"),
      section("sec-2024-1", "cy-2024", 1, "Primero A", "usr-car"),
      section("sec-2024-2", "cy-2024", 2, "Segundo A", "usr-ana"),
      section("sec-2024-3", "cy-2024", 3, "Tercero A", "usr-mar"),
      section("sec-2024-4", "cy-2024", 4, "Cuarto A", "usr-jul"),
      section("sec-2024-5", "cy-2024", 5, "Quinto A", "usr-ana"),
      section("sec-2024-6", "cy-2024", 6, "Sexto A", "usr-mar")
    ];

    var students = [
      student("stu-001", "EORM-2026-001", "Juan Carlos", "López García", "3001000102001", "2018-03-12", "Masculino", "Rosa García", "55112233", "Aldea El Pinal"),
      student("stu-002", "EORM-2026-002", "María Fernanda", "Pérez Díaz", "3001000202002", "2018-06-21", "Femenino", "Ana Díaz", "55112234", "Aldea El Pinal"),
      student("stu-003", "EORM-2026-003", "José Andrés", "Ramírez López", "3001000302003", "2018-01-09", "Masculino", "Laura López", "55112235", "Caserío La Ceiba"),
      student("stu-004", "EORM-2026-004", "Daniela Sofía", "Morales Ruiz", "3001000402004", "2017-04-14", "Femenino", "Marta Ruiz", "55112236", "Caserío La Ceiba"),
      student("stu-005", "EORM-2026-005", "Miguel Ángel", "Gómez Pérez", "3001000502005", "2017-09-03", "Masculino", "Julia Pérez", "55112237", "Aldea El Limón"),
      student("stu-006", "EORM-2026-006", "Sofía Alejandra", "Castillo Méndez", "3001000602006", "2016-02-18", "Femenino", "Elena Méndez", "55112238", "Aldea El Limón"),
      student("stu-007", "EORM-2026-007", "Luis Fernando", "Hernández Soto", "3001000702007", "2016-11-25", "Masculino", "Carmen Soto", "55112239", "Caserío Los Amates"),
      student("stu-008", "EORM-2026-008", "Valeria Isabel", "Lemus García", "3001000802008", "2015-05-30", "Femenino", "Paula García", "55112240", "Caserío Los Amates"),
      student("stu-009", "EORM-2026-009", "Mateo Sebastián", "Díaz Morales", "3001000902009", "2015-08-17", "Masculino", "Claudia Morales", "55112241", "Aldea La Cumbre"),
      student("stu-010", "EORM-2026-010", "Camila Andrea", "Ruiz Gómez", "3001001002010", "2014-03-02", "Femenino", "Teresa Gómez", "55112242", "Aldea La Cumbre"),
      student("stu-011", "EORM-2026-011", "Diego Alejandro", "Méndez Ramos", "3001001102011", "2013-07-11", "Masculino", "Patricia Ramos", "55112243", "Caserío El Centro")
    ];

    var sectionDistribution = [
      "sec-2026-1", "sec-2026-1", "sec-2026-1",
      "sec-2026-2", "sec-2026-2",
      "sec-2026-3", "sec-2026-3",
      "sec-2026-4", "sec-2026-4",
      "sec-2026-5", "sec-2026-6"
    ];
    var enrollments = students.map(function (item, index) {
      return {
        id: "enr-2026-" + String(index + 1).padStart(3, "0"),
        studentId: item.id,
        cycleId: "cy-2026",
        sectionId: sectionDistribution[index],
        status: "Activa",
        enrolledAt: "2026-01-10T09:00:00"
      };
    });
    students.slice(0, 10).forEach(function (item, index) {
      enrollments.push({
        id: "enr-2025-" + String(index + 1).padStart(3, "0"),
        studentId: item.id,
        cycleId: "cy-2025",
        sectionId: "sec-2025-" + Math.min(6, Math.max(1, Number(sectionDistribution[index].slice(-1)) - 1)),
        status: "Promovida",
        enrolledAt: "2025-01-12T09:00:00"
      });
    });
    students.slice(0, 9).forEach(function (item, index) {
      enrollments.push({
        id: "enr-2024-" + String(index + 1).padStart(3, "0"),
        studentId: item.id,
        cycleId: "cy-2024",
        sectionId: "sec-2024-" + Math.min(6, Math.max(1, Number(sectionDistribution[index].slice(-1)) - 2)),
        status: "Promovida",
        enrolledAt: "2024-01-15T09:00:00"
      });
    });

    var requirements = [
      { id: "req-1", name: "Certificación de nacimiento", active: true },
      { id: "req-2", name: "CUI del encargado", active: true },
      { id: "req-3", name: "Constancia de código personal MINEDUC", active: true },
      { id: "req-4", name: "Tarjeta de salud o vacunación", active: true },
      { id: "req-5", name: "Fotografía reciente", active: true },
      { id: "req-6", name: "Constancia del ciclo anterior", active: true }
    ];
    var studentDocuments = [];
    students.forEach(function (item, studentIndex) {
      var provided = studentIndex < 7 ? 6 : [2, 3, 4, 1][studentIndex - 7];
      requirements.slice(0, provided).forEach(function (req, reqIndex) {
        studentDocuments.push({
          id: "stdoc-" + item.id + "-" + req.id,
          studentId: item.id,
          cycleId: "cy-2026",
          requirementId: req.id,
          fileId: null,
          fileName: "documento_demostracion_" + (reqIndex + 1) + ".pdf",
          mimeType: "application/pdf",
          fileSize: 0,
          version: 1,
          versions: [],
          status: "Entregado",
          uploadedBy: "usr-dir",
          uploadedAt: "2026-02-0" + Math.min(9, reqIndex + 1) + "T10:00:00",
          notes: "Registro de demostración; archivo binario no incluido."
        });
      });
    });

    return {
      schemaVersion: 2,
      settings: {
        institution: "EORM Orfelinda Osorio Lemus",
        systemName: "Sistema de Gestión y Archivo Digital",
        activeCycleId: "cy-2026",
        selectedCycleId: "cy-2026"
      },
      cycles: [
        { id: "cy-2026", year: 2026, name: "2026 · Actual", startDate: "2026-01-05", endDate: "2026-10-30", status: "Activo" },
        { id: "cy-2025", year: 2025, name: "2025 · Histórico", startDate: "2025-01-06", endDate: "2025-10-31", status: "Cerrado" },
        { id: "cy-2024", year: 2024, name: "2024 · Histórico", startDate: "2024-01-08", endDate: "2024-10-31", status: "Cerrado" }
      ],
      users: users,
      sections: sections,
      studentIdentities: students,
      enrollments: enrollments,
      requirements: requirements,
      studentDocuments: studentDocuments,
      documentCategories: [
        { id: "cat-dir", name: "Documentos de Dirección", active: true },
        { id: "cat-act", name: "Actas y reuniones", active: true },
        { id: "cat-adm", name: "Administración", active: true },
        { id: "cat-aca", name: "Documentos académicos", active: true },
        { id: "cat-evi", name: "Evidencias docentes", active: true },
        { id: "cat-cor", name: "Correspondencia", active: true },
        { id: "cat-otr", name: "Otros", active: true }
      ],
      repositoryDocuments: [
        { id: "doc-001", code: "DOC-2026-001", cycleId: "cy-2026", title: "Acta de reunión de padres", categoryId: "cat-act", responsibleId: "usr-dir", documentDate: "2026-03-14", status: "Vigente", access: "Solo Dirección", description: "Reunión general de padres de familia.", fileId: null, fileName: "acta_reunion_padres.pdf", mimeType: "application/pdf", fileSize: 0, version: 1, versions: [], createdAt: "2026-03-14T14:30:00" },
        { id: "doc-002", code: "DOC-2026-002", cycleId: "cy-2026", title: "Planificación de Unidad", categoryId: "cat-evi", responsibleId: "usr-car", documentDate: "2026-03-18", status: "Vigente", access: "Dirección y docentes", description: "Planificación docente de demostración.", fileId: null, fileName: "planificacion_unidad.pdf", mimeType: "application/pdf", fileSize: 0, version: 1, versions: [], createdAt: "2026-03-18T09:20:00" },
        { id: "doc-003", code: "DOC-2026-003", cycleId: "cy-2026", title: "Inventario de recursos escolares", categoryId: "cat-adm", responsibleId: "usr-dir", documentDate: "2026-04-02", status: "Vigente", access: "Solo Dirección", description: "Inventario general del establecimiento.", fileId: null, fileName: "inventario.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 0, version: 1, versions: [], createdAt: "2026-04-02T11:15:00" }
      ],
      deliveryRequests: [
        { id: "delreq-001", cycleId: "cy-2026", title: "Planificación de Unidad IV", description: "Entregar planificación correspondiente a la cuarta unidad.", categoryId: "cat-evi", allowedFormats: ["PDF", "DOCX"], dueDate: "2026-10-20", priority: "Alta", targetUserIds: ["usr-car", "usr-ana", "usr-mar", "usr-jul"], status: "Vigente", createdBy: "usr-dir", createdAt: "2026-10-01T08:30:00" },
        { id: "delreq-002", cycleId: "cy-2026", title: "Cuadros de calificaciones · IV Bimestre", description: "Presentar cuadros finales de calificaciones.", categoryId: "cat-evi", allowedFormats: ["PDF", "XLSX"], dueDate: "2026-10-25", priority: "Normal", targetUserIds: ["usr-car", "usr-ana", "usr-mar", "usr-jul"], status: "Vigente", createdBy: "usr-dir", createdAt: "2026-10-02T09:00:00" },
        { id: "delreq-003", cycleId: "cy-2026", title: "Reporte mensual de asistencia", description: "Adjuntar consolidado de asistencia del mes.", categoryId: "cat-evi", allowedFormats: ["PDF", "XLSX"], dueDate: "2026-10-31", priority: "Normal", targetUserIds: ["usr-car", "usr-ana", "usr-mar", "usr-jul"], status: "Vigente", createdBy: "usr-dir", createdAt: "2026-10-03T10:00:00" }
      ],
      submissions: [
        { id: "sub-001", code: "ENT-2026-001", requestId: "delreq-001", teacherId: "usr-car", fileId: null, fileName: "planificacion_carlos.pdf", mimeType: "application/pdf", fileSize: 0, version: 1, versions: [], status: "Recibido", submittedAt: "2026-10-07T09:20:00", reviewedAt: null, reviewedBy: null, correctionReason: "", notes: "Entrega de demostración; archivo binario no incluido." }
      ],
      notifications: [
        { id: "not-001", userId: "usr-dir", title: "Nueva entrega recibida", message: "Carlos Hernández entregó Planificación de Unidad IV.", type: "submission", relatedId: "sub-001", targetView: "reviews", read: false, createdAt: "2026-10-07T09:21:00" },
        { id: "not-002", userId: "usr-dir", title: "Solicitud próxima a vencer", message: "La solicitud Planificación de Unidad IV vence próximamente.", type: "request", relatedId: "delreq-001", targetView: "requests", read: false, createdAt: "2026-10-07T08:00:00" }
      ],
      audit: [
        { id: "aud-001", date: "2026-10-07T09:20:00", userId: "usr-car", role: "Docente", action: "Subió entrega", module: "Entregas", record: "ENT-2026-001", details: "Planificación de Unidad IV" },
        { id: "aud-002", date: "2026-10-03T10:00:00", userId: "usr-dir", role: "Directora", action: "Creó solicitud", module: "Solicitudes", record: "delreq-003", details: "Reporte mensual de asistencia" },
        { id: "aud-003", date: "2026-04-02T11:15:00", userId: "usr-dir", role: "Directora", action: "Subió documento institucional", module: "Repositorio", record: "DOC-2026-003", details: "Inventario de recursos escolares" }
      ],
      trash: [],
      lastUpdatedAt: "2026-10-07T09:21:00"
    };
  }

  window.SGAD_CREATE_DEFAULT_STATE = createDefaultState;
})();
