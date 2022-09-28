FROM node:18-slim as build

WORKDIR /usr/src/app
COPY . .

RUN yarn --production

FROM gcr.io/distroless/nodejs:18

ENV AZURE_APP_CONFIGURATION_ENDPOINT=${AZURE_APP_CONFIGURATION_ENDPOINT}
ENV NODE_ENV=production
LABEL org.opencontainers.image.source=https://github.com/liatrio/terraform-azure-github-runner

COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app

# RUN apt-get update && apt-get install -y curl && \
#     curl -sL https://aka.ms/InstallAzureCLIDeb | bash

CMD ["app.js"]
