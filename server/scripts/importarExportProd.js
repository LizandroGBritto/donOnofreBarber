/**
 * Carga en una base local los JSON exportados de producción con `mongoexport
 * --jsonArray`.
 *
 * Existe porque en Windows están instaladas las MongoDB Database Tools solo en
 * el server, no acá: sin `mongorestore` local, el .archive.gz no se puede
 * cargar. Estos JSON sí, usando el driver que ya trae mongoose.
 *
 * Los documentos vienen en Extended JSON ({"$oid":...}, {"$date":...}), así que
 * se parsean con EJSON para conservar ObjectId y Date reales. Los _id se
 * mantienen idénticos a producción — eso importa porque las referencias entre
 * agendas y barberos son por _id.
 *
 * USO:
 *   node scripts/importarExportProd.js <carpeta-json> [nombreBaseDestino]
 *
 * Ejemplo:
 *   node scripts/importarExportProd.js db-backups/prod-2026-08-22-actual/json OnofreDb_prod
 *
 * La base destino se VACÍA antes de cargar. Por seguridad se niega a escribir
 * sobre OnofreDb (la base de desarrollo) salvo que se pase --forzar.
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");

const BASE_PROTEGIDA = "OnofreDb";

async function main() {
  const args = process.argv.slice(2);
  const forzar = args.includes("--forzar");
  const posicionales = args.filter((a) => !a.startsWith("--"));

  const carpeta = posicionales[0];
  const nombreBase = posicionales[1] || "OnofreDb_prod";

  if (!carpeta) {
    console.error(
      "Uso: node scripts/importarExportProd.js <carpeta-json> [nombreBaseDestino]"
    );
    process.exit(1);
  }

  const carpetaAbs = path.resolve(carpeta);
  if (!fs.existsSync(carpetaAbs)) {
    console.error(`No existe la carpeta: ${carpetaAbs}`);
    process.exit(1);
  }

  if (nombreBase === BASE_PROTEGIDA && !forzar) {
    console.error(
      `Negado: "${BASE_PROTEGIDA}" es tu base de desarrollo y se borraría entera.\n` +
        `Elegí otro nombre (ej. OnofreDb_prod) o pasá --forzar si es lo que querés.`
    );
    process.exit(1);
  }

  const archivos = fs
    .readdirSync(carpetaAbs)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (archivos.length === 0) {
    console.error(`No hay archivos .json en ${carpetaAbs}`);
    process.exit(1);
  }

  const uri = process.env.MONGO_LOCAL_URI || "mongodb://127.0.0.1:27017";
  const cliente = new MongoClient(uri);

  await cliente.connect();
  console.log(`Conectado a ${uri}`);
  console.log(`Base destino: ${nombreBase}`);
  console.log(`Origen: ${carpetaAbs}\n`);

  const db = cliente.db(nombreBase);
  const resumen = [];

  for (const archivo of archivos) {
    const coleccion = path.basename(archivo, ".json");
    const crudo = fs.readFileSync(path.join(carpetaAbs, archivo), "utf8");

    let docs;
    try {
      docs = EJSON.parse(crudo, { relaxed: false });
    } catch (error) {
      console.log(`  ERR  ${coleccion}: JSON inválido — ${error.message}`);
      resumen.push(`${coleccion}: ERROR`);
      continue;
    }

    if (!Array.isArray(docs)) docs = [docs];

    await db.collection(coleccion).deleteMany({});
    if (docs.length > 0) {
      await db.collection(coleccion).insertMany(docs, { ordered: false });
    }

    const cuenta = await db.collection(coleccion).countDocuments();
    const ok = cuenta === docs.length ? "OK " : "DIF";
    console.log(`  ${ok}  ${coleccion}: ${cuenta} documentos`);
    resumen.push(`${coleccion}: ${cuenta}`);
  }

  console.log(`\nListo. ${resumen.length} colecciones cargadas en "${nombreBase}".`);
  await cliente.close();
}

main().catch((error) => {
  console.error("Falló la importación:", error);
  process.exit(1);
});
