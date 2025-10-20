const express = require("express");
const bodyParser = require("body-parser");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
require("chromedriver");
const cheerio = require("cheerio");

const app = express();
app.use(bodyParser.json());

/**
 * Función que realiza el scraping de adeudos usando Selenium.
 * @param {Object} consulta - Objeto con los datos: placa, niv, propietario y motor.
 * @returns {Promise<Array>} Array con la información extraída.
 */
async function scrapeAdeudos(consulta) {
  let options = new chrome.Options();
  options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");

  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    // Navegar a la página de adeudos
    await driver.get("https://gobiernoenlinea1.jalisco.gob.mx/serviciosVehiculares/adeudos");

    // Esperar que el formulario se cargue (por el input "placa")
    await driver.wait(until.elementLocated(By.name("placa")), 10000);

    // Completar el formulario
    await driver.findElement(By.name("placa")).sendKeys(consulta.placa);
    await driver.findElement(By.name("numeroSerie")).sendKeys(consulta.niv);
    await driver.findElement(By.name("nombrePropietario")).sendKeys(consulta.propietario);
    await driver.findElement(By.name("numeroMotor")).sendKeys(consulta.motor);

    // Esperar que el botón "Consultar" sea clickeable y hacer click
    const btnConsultar = await driver.wait(until.elementLocated(By.id("btnConsultar")), 10000);
    await driver.wait(until.elementIsEnabled(btnConsultar), 10000);
    await btnConsultar.click();

    // Esperar hasta que se cargue al menos un contenedor de resultados
    await driver.wait(until.elementLocated(By.css('div[ng-repeat="v in adeudosList"]')), 5000);

    // Obtener el HTML de la página
    const html = await driver.getPageSource();

    // Procesar el HTML con Cheerio
    const $ = cheerio.load(html);
    const adeudosData = [];

    // Cada vehículo se encuentra en un div con ng-repeat="v in adeudosList"
    $('div[ng-repeat="v in adeudosList"]').each((i, elem) => {
      const placa = $(elem).find("h4.ng-binding").first().text().trim() || "";
      const total = $(elem).find("h5.ng-binding").first().text().trim() || "";

      const grupos = [];
      let currentGroup = null;

      // Procesar cada concepto que se encuentra en un div con ng-repeat="a in v.conceptos"
      $(elem).find('div[ng-repeat="a in v.conceptos"]').each((j, row) => {
        const headerDiv = $(row).find("div.col-sm-12.ng-scope").first();
        const totalDiv = $(row).find("div.col-sm-12.text-right.text-bold.ng-binding.ng-scope").first();
        
        // Si se detecta un header Y NO hay un total en la misma fila, se inicia un nuevo grupo
        if (headerDiv.length > 0 && totalDiv.length === 0) {
          if (currentGroup !== null) {
            grupos.push(currentGroup);
          }
          currentGroup = {
            tipo: headerDiv.text().trim(),
            items: []
          };
        }
        
        // Extraer la descripción y el monto del concepto
        const descDiv = $(row).find("div.col-sm-11.ng-binding").first();
        const descripcion = descDiv.length ? descDiv.text().replace(/\s+/g, " ").trim() : "";
        
        const amtDiv = $(row).find("div.col-sm-1.text-right.ng-binding").first();
        const monto = amtDiv.length ? amtDiv.text().trim() : "";
        
        if ((descripcion || monto) && currentGroup) {
          currentGroup.items.push({ descripcion, monto });
        }
        
        // Si se detecta el total del grupo, se asigna y se finaliza el grupo actual
        if (totalDiv.length > 0 && currentGroup) {
          currentGroup.montoTotal = totalDiv.text().replace(/\s+/g, " ").trim();
          grupos.push(currentGroup);
          currentGroup = null;
        }
      });
      
      if (currentGroup !== null) {
        grupos.push(currentGroup);
      }
      
      adeudosData.push({
        placa,
        total,
        conceptos: grupos
      });
    });
    
    return adeudosData;
  } catch (error) {
    throw error;
  } finally {
    await driver.quit();
  }
}

app.post("/adeudos", async (req, res) => {
  const consulta = req.body;
  try {
    const data = await scrapeAdeudos(consulta);
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
