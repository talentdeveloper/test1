cp -f claudia-qa.json claudia.json
cp -f env-qa .env
perl -i -pe 's/"connect-api[^"]*"/"connect-api-qa"/g' ./package.json
yarn deploy-api
