cp -f claudia-dev.json claudia.json
cp -f env-dev .env
perl -i -pe 's/"connect-api[^"]*"/"connect-api-dev"/g' ./package.json
yarn deploy-api
