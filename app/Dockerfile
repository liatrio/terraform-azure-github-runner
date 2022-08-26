FROM node:18-bullseye as test
WORKDIR /app
COPY /src .
COPY .eslintrc.yaml package.json yarn.lock ./
RUN yarn --prod && mkdir -p /tmp/prod && cp -r node_modules /tmp/prod/node_modules
RUN yarn && yarn run lint

FROM node:18-bullseye-slim as run
WORKDIR /app
COPY --from=test /tmp/prod/node_modules node_modules
COPY --from=test /app .
ENV NODE_ENV=production
ENV AZURE_APP_CONFIGURATION_ENDPOINT=https://appcs-gh-run-controller-liatriodev.azconfig.io

ENTRYPOINT [ "node", "app.js" ]
