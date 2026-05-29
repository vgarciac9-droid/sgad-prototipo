function iniciarSesion(){
    window.location.href = "pages/dashboard.html";
}

function guardarEstudiante(){
    let nombres = document.getElementById("nombres").value;
    let apellidos = document.getElementById("apellidos").value;
    let grado = document.getElementById("grado").value;
    let encargado = document.getElementById("encargado").value;
    let estado = document.getElementById("estado").value;

    if(nombres === "" || apellidos === "" || grado === "Seleccione"){
        alert("Por favor complete nombres, apellidos y grado.");
        return;
    }

    let estudiantes = JSON.parse(localStorage.getItem("estudiantes")) || [];

    let nuevoEstudiante = {
        id: String(estudiantes.length + 5).padStart(3, "0"),
        nombre: nombres + " " + apellidos,
        grado: grado,
        encargado: encargado,
        estado: estado
    };

    estudiantes.push(nuevoEstudiante);
    localStorage.setItem("estudiantes", JSON.stringify(estudiantes));

    alert("Estudiante guardado correctamente");
    window.location.href = "estudiantes.html";
}

function cargarEstudiantes(){
    let tabla = document.getElementById("tabla-estudiantes");

    if(!tabla){
        return;
    }

    let estudiantes = JSON.parse(localStorage.getItem("estudiantes")) || [];

    estudiantes.forEach(estudiante => {
        let fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${estudiante.id}</td>
            <td>${estudiante.nombre}</td>
            <td>${estudiante.grado}</td>
            <td>${estudiante.encargado}</td>
            <td><span class="${estudiante.estado === "Activo" ? "activo" : "pendiente"}">${estudiante.estado}</span></td>
            <td>👁️ ✏️ 🗑️</td>
        `;

        tabla.appendChild(fila);
    });
}

document.addEventListener("DOMContentLoaded", cargarEstudiantes);