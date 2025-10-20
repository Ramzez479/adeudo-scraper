FROM node:22-slim

# Dependencias de Chrome + utilidades
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl gnupg ca-certificates unzip jq \
    fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
    libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxrandr2 libxi6 libxdamage1 libxext6 libxtst6 libxss1 libglib2.0-0 libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# Instalar Google Chrome estable
RUN wget -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get update && apt-get install -y --no-install-recommends /tmp/chrome.deb \
    && rm -f /tmp/chrome.deb

# Descargar ChromeDriver que coincide con la versión de Chrome instalada
# Usa el dashboard de "Chrome for Testing" para localizar la build exacta.
RUN set -eux; \
    CHROME_VER="$(google-chrome --version | awk '{print $3}')" ; \
    MAJOR="${CHROME_VER%%.*}" ; \
    # buscamos la última build por major (p. ej., 141.x.y.z)
    URL_JSON="https://googlechromelabs.github.io/chrome-for-testing/latest-per-major-with-downloads.json"; \
    FULL_VER="$(curl -sSL "$URL_JSON" | jq -r ".versions[] | select(.version | startswith(\"${MAJOR}.\")) | .version" | head -n1)"; \
    # del JSON extraemos el zip del chromedriver linux64 que matchea FULL_VER
    DRIVER_URL="$(curl -sSL "$URL_JSON" | jq -r ".versions[] | select(.version==\"${FULL_VER}\") | .downloads.chromedriver[] | select(.platform==\"linux64\") | .url")"; \
    echo "Chrome ${CHROME_VER} → Chromedriver ${FULL_VER}"; \
    curl -sSL "$DRIVER_URL" -o /tmp/chromedriver.zip; \
    unzip -q /tmp/chromedriver.zip -d /tmp/; \
    install -m 0755 /tmp/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver; \
    rm -rf /tmp/chromedriver.zip /tmp/chromedriver-linux64

# (Opcional) variables útiles para muchas libs
ENV CHROME_BIN=/usr/bin/google-chrome \
    PUPPETEER_SKIP_DOWNLOAD=true \
    NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
