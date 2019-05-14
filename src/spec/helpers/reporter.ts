const reporters = require('jasmine-reporters');
const TSConsoleReporter = require('jasmine-ts-console-reporter');

jasmine.getEnv().clearReporters();

jasmine.getEnv().addReporter(new TSConsoleReporter());

const junitReporter = new reporters.JUnitXmlReporter({
  savePath: __dirname + '../../../../test-results',
  consolidateAll: false
});
jasmine.getEnv().addReporter(junitReporter);
