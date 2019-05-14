cp -f claudia-stg.json claudia.json
cp -f env-stg .env
perl -i -pe 's/"connect-api[^"]*"/"connect-api-stg"/g' ./package.json
yarn deploy-api
