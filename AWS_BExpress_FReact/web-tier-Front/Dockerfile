FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*
WORKDIR /app
COPY --from=builder /app/build /app/build
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD [ "nginx" , "-g" , "daemon off;" ]