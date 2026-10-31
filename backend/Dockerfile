FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY .sequelizerc ./

EXPOSE 3001

# Sin root: si el proceso se compromete, el atacante no es root en el contenedor.
# Los archivos son de root y solo lectura para este usuario.
USER node

CMD ["node", "src/server.js"]
