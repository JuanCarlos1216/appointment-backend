const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs'); // Importa yamljs para cargar el archivo YML

const app = express();

// Carga el archivo openapi.yml
const swaggerDocument = YAML.load('./openapi.yml'); // Ruta de tu archivo .yml

// Agregar el middleware de Swagger UI para servir la documentación
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(3000, () => {
    console.log('Servidor escuchando en puerto 3000');
    console.log('Documentación Swagger disponible en http://localhost:3000/api-docs');
});
