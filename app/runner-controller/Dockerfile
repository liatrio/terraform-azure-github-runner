FROM node:18-slim as build

WORKDIR /usr/src/app
COPY . .

EXPOSE 80

RUN yarn --production

FROM gcr.io/distroless/nodejs:18

ENV NODE_ENV=production
LABEL org.opencontainers.image.source=https://github.com/liatrio/terraform-azure-github-runner

COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app

CMD ["app.js"]
