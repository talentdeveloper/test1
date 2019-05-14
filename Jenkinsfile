#!/usr/bin/env groovy

import java.text.SimpleDateFormat

node {
  properties([
    [$class: 'ScannerJobProperty', doNotScan: false],
    [$class: 'RebuildSettings', autoRebuild: false, rebuildDisabled: false],
    pipelineTriggers([pollSCM('* * * * *')])
  ])


  stage('Checkout project') {
    checkout([
      $class: 'GitSCM',
      branches: [[name: '*/qa']],
      doGenerateSubmoduleConfigurations: false,
      extensions: [],
      submoduleCfg: [],
      userRemoteConfigs: [[
        url: 'git@bitbucket.org:ItsNever2Late/connectapi.git'
      ]]
    ])
  }

  stage('Trigger QA Build & Deploy') {
    build job: 'BuildDeploy_ConnectAPI', parameters: [string(name: 'DEPLOY_ENV', value: 'qa'), string(name: 'VERSION', value: '')]
  }
}
