FROM node:22.14.0-slim

# Evita descargar Chromium de Puppeteer (no se usa) y optimiza entorno
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=1

# Dependencias necesarias para ejecutar Chrome/Chromium en modo headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxshmfence1 \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

# No instalamos google-chrome-stable; Selenium Manager descargará Chrome for Testing

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copia el resto del código de la aplicación
COPY index.js ./

# Expone el puerto en el que corre la aplicación (3000 en este caso)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]