FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run deploy:build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/app.js /app/index.js /app/mongo.js ./
COPY --from=build /app/models ./models
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
