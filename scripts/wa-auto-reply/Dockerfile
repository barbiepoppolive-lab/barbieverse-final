FROM node:22-slim

# Chromium + the libraries it actually needs. The previous list was missing
# libgbm1 and libxkbcommon0, which Chromium loads at startup — without them the
# container builds fine and then dies on the first launch with an opaque error.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      fonts-noto-color-emoji \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libgdk-pixbuf2.0-0 \
      libglib2.0-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
      xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Emoji font is not cosmetic here: Barbie's replies contain 😊 and Chromium
# renders missing glyphs as boxes, which would go out in real messages.

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Session lives on a Railway volume mounted at /data by the service config,
# NOT in the image. Without that volume every deploy wipes the login and
# demands a fresh QR scan.
#
# Do NOT add a Docker `VOLUME` instruction here — Railway rejects the build
# outright ("docker VOLUME is not supported, use Railway Volumes").
ENV WA_SESSION_DIR=/data/wwebjs_auth

CMD ["npx", "tsx", "index.ts"]
