// Convierte texto Markdown básico a HTML (sin librerías externas)
function markdownAHtml(md) {
  let html = md
    // encabezados
    .replace(/^### (.*)$/gim, "<h3>$1</h3>")
    .replace(/^## (.*)$/gim, "<h2>$1</h2>")
    .replace(/^# (.*)$/gim, "<h1>$1</h1>")
    // negrita e cursiva
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    // imágenes ![alt](url) -- tiene que ir antes que los enlaces
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" loading="lazy">')
    // enlaces [texto](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
    // listas simples ("- item")
    .replace(/^\s*-\s+(.*)$/gim, "<li>$1</li>");

  // envolver <li> sueltos en <ul>
  html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");

  // párrafos: separa por líneas en blanco y envuelve lo que no sea ya una etiqueta
  html = html
    .split(/\n\s*\n/)
    .map(bloque => {
      const b = bloque.trim();
      if (!b) return "";
      if (b.startsWith("<h") || b.startsWith("<ul") || b.startsWith("<li")) return b;
      if (/^(<img[^>]*>\s*)+$/.test(b)) return `<div class="imgs">${b}</div>`;
      return `<p>${b}</p>`;
    })
    .join("\n");

  return html;
}

// Separa el "front matter" (metadata entre ---) del cuerpo del texto
function parseFrontMatter(texto) {
  const match = texto.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, cuerpo: texto };
  }
  const bloqueMeta = match[1];
  const cuerpo = match[2];

  const meta = {};
  bloqueMeta.split("\n").forEach(linea => {
    const idx = linea.indexOf(":");
    if (idx === -1) return;
    const clave = linea.slice(0, idx).trim();
    const valor = linea.slice(idx + 1).trim();
    meta[clave] = valor;
  });

  return { meta, cuerpo };
}

// Genera un "slug" (identificador de URL) a partir de la ruta del archivo .md
// Ej: "notas/2026-08-22-primera-nota.md" -> "2026-08-22-primera-nota"
function slugDesdeRuta(ruta) {
  return ruta.split("/").pop().replace(/\.md$/, "");
}

// Extrae solo las imágenes markdown del cuerpo y las devuelve como HTML,
// agrupando las que están juntas (misma lógica que markdownAHtml)
function extraerImagenesHtml(cuerpo) {
  const bloques = cuerpo.split(/\n\s*\n/);
  const htmlImagenes = [];

  bloques.forEach(bloque => {
    const b = bloque.trim();
    const soloImagenes = b
      .split("\n")
      .every(linea => /^\s*(!\[[^\]]*\]\([^)]+\)\s*)+\s*$/.test(linea.trim()) || linea.trim() === "");
    if (!soloImagenes || !/!\[[^\]]*\]\([^)]+\)/.test(b)) return;

    const convertido = b.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gim,
      '<img src="$2" alt="$1" loading="lazy">'
    );
    htmlImagenes.push(`<div class="imgs">${convertido}</div>`);
  });

  return htmlImagenes.join("\n");
}

// Extrae un resumen en texto plano del cuerpo de la nota (sin imágenes, sin markdown)
function generarResumen(cuerpo, maxCaracteres = 220) {
  const textoPlano = cuerpo
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")   // saca imágenes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // deja el texto de los links
    .replace(/[#*_>-]/g, "")                 // saca símbolos de markdown
    .replace(/\s+/g, " ")                    // colapsa espacios/saltos de línea
    .trim();

  if (textoPlano.length <= maxCaracteres) return textoPlano;
  return textoPlano.slice(0, maxCaracteres).trim() + "…";
}

let TODAS_LAS_NOTAS = []; // se llena una sola vez al cargar

function renderLista(contenedor) {
  contenedor.innerHTML = "";

  TODAS_LAS_NOTAS.forEach(nota => {
    const art = document.createElement("article");

    const h2 = document.createElement("h2");
    h2.textContent = nota.meta.titulo || "Sin título";
    art.appendChild(h2);

    if (nota.meta.fecha) {
      const time = document.createElement("time");
      time.textContent = nota.meta.fecha;
      art.appendChild(time);
    }

    const imagenesHtml = extraerImagenesHtml(nota.cuerpo);
    if (imagenesHtml) {
      const imgDiv = document.createElement("div");
      imgDiv.innerHTML = imagenesHtml;
      art.appendChild(imgDiv);
    }

    const resumen = document.createElement("p");
    resumen.className = "resumen";
    resumen.textContent = generarResumen(nota.cuerpo);
    art.appendChild(resumen);

    const leerMas = document.createElement("a");
    leerMas.className = "leer-mas";
    leerMas.href = "#nota=" + nota.slug;
    leerMas.textContent = "Leer más →";
    art.appendChild(leerMas);

    contenedor.appendChild(art);
  });
}

function renderNota(contenedor, slug) {
  const nota = TODAS_LAS_NOTAS.find(n => n.slug === slug);

  if (!nota) {
    contenedor.innerHTML = "<p id=\"estado\">No se encontró esa nota.</p>";
    return;
  }

  contenedor.innerHTML = "";

  const volver = document.createElement("a");
  volver.className = "volver";
  volver.href = "#";
  volver.textContent = "← Volver";
  contenedor.appendChild(volver);

  const art = document.createElement("article");

  const h2 = document.createElement("h2");
  h2.textContent = nota.meta.titulo || "Sin título";
  art.appendChild(h2);

  if (nota.meta.fecha) {
    const time = document.createElement("time");
    time.textContent = nota.meta.fecha;
    art.appendChild(time);
  }

  const cuerpoDiv = document.createElement("div");
  cuerpoDiv.innerHTML = markdownAHtml(nota.cuerpo);
  art.appendChild(cuerpoDiv);

  contenedor.appendChild(art);

  // sube el scroll al principio al abrir una nota
  window.scrollTo(0, 0);
}

// Decide qué mostrar según el hash actual de la URL (#nota=slug o vacío)
function enrutar() {
  const contenedor = document.getElementById("notas");
  const hash = window.location.hash; // ej: "#nota=2026-08-22-primera-nota"

  if (hash.startsWith("#nota=")) {
    const slug = decodeURIComponent(hash.replace("#nota=", ""));
    renderNota(contenedor, slug);
  } else {
    renderLista(contenedor);
  }
}

async function cargarNotas() {
  const contenedor = document.getElementById("notas");
  const estado = document.getElementById("estado");

  try {
    const resIndice = await fetch("indice.json");
    if (!resIndice.ok) throw new Error("No se pudo leer indice.json");
    const archivos = await resIndice.json();

    const notas = await Promise.all(
      archivos.map(async ruta => {
        const res = await fetch(ruta);
        if (!res.ok) throw new Error(`No se pudo leer ${ruta}`);
        const texto = await res.text();
        const parseada = parseFrontMatter(texto);
        return { ...parseada, slug: slugDesdeRuta(ruta) };
      })
    );

    // ordena por fecha descendente (si existe la metadata "fecha")
    notas.sort((a, b) => (b.meta.fecha || "").localeCompare(a.meta.fecha || ""));

    TODAS_LAS_NOTAS = notas;

    estado.remove();
    enrutar();

    // cada vez que cambia el hash (clic en "Leer más" o "Volver"), re-renderiza
    window.addEventListener("hashchange", enrutar);
  } catch (err) {
    estado.textContent = "Error al cargar las notas: " + err.message;
    console.error(err);
  }
}

cargarNotas();
