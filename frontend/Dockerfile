FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# La URL del backend se fija al construir (Vite la incrusta en el bundle).
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
# Pista de usuarios de demo en el login: solo en builds de demostracion.
ARG VITE_DEMO_HINT=false
ENV VITE_DEMO_HINT=$VITE_DEMO_HINT
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
