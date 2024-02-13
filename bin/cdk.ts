#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkEcspressoStack } from '../lib/cdk-ecspresso-stack';

const app = new cdk.App();
// 環境変数の読み込み
export const context = app.node.tryGetContext(app.node.tryGetContext('env'))
// Add cost ditribution tag on this entire app
cdk.Tags.of(app).add('CmBillingGroup', context.costTagValue)

new CdkEcspressoStack(app, 'CdkEcspressoStack', {
  env: context.env
});
