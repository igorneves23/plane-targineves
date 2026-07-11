FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["sh", "-c", "npx tsx prisma/cleanup-mirrors.ts && npx tsx prisma/cleanup-recurring-duplicates.ts && npx prisma db push && npm run start"]
