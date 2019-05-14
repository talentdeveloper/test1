cp -f claudia-prod.json claudia.json
cp -f env-prod .env
perl -i -pe 's/"connect-api[^"]*"/"connect-api-prod"/g' ./package.json
yarn deploy-api