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
        return parseFrontMatter(texto);
      })
    );

    // ordena por fecha descendente (si existe la metadata "fecha")
    notas.sort((a, b) => (b.meta.fecha || "").localeCompare(a.meta.fecha || ""));

    estado.remove();

    notas.forEach(nota => {
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
    });
  } catch (err) {
    estado.textContent = "Error al cargar las notas: " + err.message;
    console.error(err);
  }
}

cargarNotas();
