import { Stack, StackProps } from "aws-cdk-lib";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Vpc } from 'aws-cdk-lib/aws-ec2'
import { Construct } from "constructs";
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Cluster } from "aws-cdk-lib/aws-ecs";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { context } from "../bin/cdk";

// CDK + ecspressoで構築するコンテナ関連リソース
export class CdkEcspressoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)
    // VPC
    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      vpcName: context.vpcName,
      subnetConfiguration: [
        //app1 public subnet
        {
          cidrMask: 24,
          name: context.app1.name + 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        //app2 public subnet
        {
          cidrMask: 24,
          name: context.app2.name + 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        //app3 public subnet
        {
          cidrMask: 24,
          name: context.app3.name + 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        //app1 private subnet
        {
          cidrMask: 24,
          name: context.app1.name + 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        //app2 private subnet
        {
          cidrMask: 24,
          name: context.app2.name + 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        //app3 private subnet
        {
          cidrMask: 24,
          name: context.app3.name + 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    })

    console.log('--------------')
    const publicSubnetIdList = vpc.publicSubnets.map(obj => obj.subnetId);
    //app1
    console.log('publicSubnetIdList[0]: ' + publicSubnetIdList[0]);
    console.log('publicSubnetIdList[1]: ' + publicSubnetIdList[1]);
    //app2
    console.log('publicSubnetIdList[2]: ' + publicSubnetIdList[2]);
    console.log('publicSubnetIdList[3]: ' + publicSubnetIdList[3]);
    //app3
    console.log('publicSubnetIdList[4]: ' + publicSubnetIdList[4]);
    console.log('publicSubnetIdList[5]: ' + publicSubnetIdList[5]);
    console.log('--------------')
    const priavteSubnetIdList = vpc.privateSubnets.map(obj => obj.subnetId);
    //app1
    console.log('privateSubnetIdList[0]: ' + priavteSubnetIdList[0]);
    console.log('privateSubnetIdList[1]: ' + priavteSubnetIdList[1]);
    //app2
    console.log('privateSubnetIdList[2]: ' + priavteSubnetIdList[2]);
    console.log('privateSubnetIdList[3]: ' + priavteSubnetIdList[3]);
    //app3
    console.log('privateSubnetIdList[4]: ' + priavteSubnetIdList[4]);
    console.log('privateSubnetIdList[5]: ' + priavteSubnetIdList[5]);

    // ALB for app1
    // SG
    const albSg1 = new ec2.SecurityGroup(this, 'AlbSg1', { vpc, allowAllOutbound: false });
    const containerSg1 = new ec2.SecurityGroup(this, 'ContainerSg1', { vpc });
    // インバウンドを許可
    albSg1.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(context.app1.alb.inboundport)); //8080
    // ALB ⇔ コンテナ間の通信を許可
    albSg1.connections.allowTo(containerSg1, ec2.Port.tcp(context.app1.alb.outboundport)); //80
    // ALB
    const alb1 = new elbv2.ApplicationLoadBalancer(this, 'Alb', { 
      vpc, 
      loadBalancerName: context.app1.alb.name,
      internetFacing: true, 
      securityGroup: albSg1,
    });
    // TG for app1
    const containerTg1 = new elbv2.ApplicationTargetGroup(this, 'ContainerTg1', { targetType: elbv2.TargetType.IP, port: context.app1.alb.outboundport, vpc }); //80
    // ALBリスナー
    // 作成したTGをALBに紐づけ
    alb1.addListener('Listener1', { defaultTargetGroups: [containerTg1], open: true, port: context.app1.alb.inboundport }); //8080


    // ALB for app2
    // SG
    const albSg2 = new ec2.SecurityGroup(this, 'AlbSg2', { vpc, allowAllOutbound: false });
    const containerSg2 = new ec2.SecurityGroup(this, 'ContainerSg2', { vpc });
    // インバウンドを許可
    albSg2.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(context.app2.alb.inboundport)); //8080
    // ALB ⇔ コンテナ間の通信を許可
    albSg2.connections.allowTo(containerSg2, ec2.Port.tcp(context.app2.alb.outboundport)); //80
    // ALB
    const alb2 = new elbv2.ApplicationLoadBalancer(this, 'Alb2', {
      vpc,
      loadBalancerName: context.app2.alb.name,
      internetFacing: true, 
      securityGroup: albSg2,
    });
    // TG
    const containerTg2 = new elbv2.ApplicationTargetGroup(this, 'ContainerTg2', { targetType: elbv2.TargetType.IP, port: context.app2.alb.outboundport, vpc }); //80
    // ALBリスナー
    // 作成したTGをALBに紐づけ
    alb2.addListener('Listener2', { defaultTargetGroups: [containerTg2], open: true, port: context.app2.alb.inboundport }); //8080

    // ALB for app3
    // SG
    const albSg3 = new ec2.SecurityGroup(this, 'AlbSg3', { vpc, allowAllOutbound: false });
    const containerSg3 = new ec2.SecurityGroup(this, 'ContainerSg3', { vpc });
    // インバウンドを許可
    albSg3.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(context.app3.alb.inboundport)); //8080
    // ALB ⇔ コンテナ間の通信を許可
    albSg3.connections.allowTo(containerSg2, ec2.Port.tcp(context.app3.alb.outboundport)); //80
    // ALB
    const alb3 = new elbv2.ApplicationLoadBalancer(this, 'Alb3', {
      vpc,
      loadBalancerName: context.app2.alb.name,
      internetFacing: true, 
      securityGroup: albSg3,
    });
    // TG
    const containerTg3 = new elbv2.ApplicationTargetGroup(this, 'ContainerTg3', { targetType: elbv2.TargetType.IP, port: context.app3.alb.outboundport, vpc }); //80
    // ALBリスナー
    // 作成したTGをALBに紐づけ
    alb3.addListener('Listener3', { defaultTargetGroups: [containerTg3], open: true, port: context.app3.alb.inboundport }); //8080
    // ロググループ
    const logGroup1 = new LogGroup(this, 'logGroup1', {
      logGroupName: '/ecs/' + context.app1.name,
    });
    const logGroup2 = new LogGroup(this, 'logGroup2', {
      logGroupName: '/ecs/' + context.app2.name,
    });
    const logGroup3 = new LogGroup(this, 'logGroup3', {
      logGroupName: '/ecs/' + context.app3.name,
    });
    // ECSクラスタ
    const cluster1 = new Cluster(this, 'EcsCluster1', { vpc, clusterName: context.app1.name });
    const cluster2 = new Cluster(this, 'EcsCluster2', { vpc, clusterName: context.app2.name });
    const cluster3 = new Cluster(this, 'EcsCluster3', { vpc, clusterName: context.app3.name });
    // タスクロール
    const taskRole = new Role(this, 'TaskRole', { assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'), });
    // タスク実行ロール
    const taskExecRole = new Role(this, 'TaskExecRole', { assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'), });

    // ECR
    const repository = new Repository(this, 'Repository', {});
    // タスク実行ロールに権限付与
    repository.grantPull(taskExecRole); // ECRのPULL権限
    logGroup1.grantWrite(taskExecRole); // ログ吐き出し権限
    logGroup2.grantWrite(taskExecRole); // ログ吐き出し権限
    logGroup3.grantWrite(taskExecRole); // ログ吐き出し権限

    // SSMパラメータの設定
    new ssm.StringParameter(this, 'TaskRoleParam', { parameterName: '/ecs/cdk-ecspresso/task-role', stringValue: taskRole.roleArn });
    new ssm.StringParameter(this, 'TaskExecRoleParam', { parameterName: '/ecs/cdk-ecspresso/task-exec-role', stringValue: taskExecRole.roleArn });
    // app1
    new ssm.StringParameter(this, 'ContainerSubnetApp1a', { parameterName: '/ecs/cdk-ecspresso/subnet-' + context.app1.name + '-a', stringValue: priavteSubnetIdList[0] });
    new ssm.StringParameter(this, 'ContainerSubnetApp1c', { parameterName: '/ecs/cdk-ecspresso/subnet-' + context.app1.name + '-c', stringValue: priavteSubnetIdList[1] });
    new ssm.StringParameter(this, 'ContainerSgParam1', { parameterName: '/ecs/cdk-ecspresso/sg-id-' + context.app1.name, stringValue: containerSg1.securityGroupId });
    new ssm.StringParameter(this, 'ContainerTgParam1', { parameterName: '/ecs/cdk-ecspresso/tg-arn-' + context.app1.name, stringValue: containerTg1.targetGroupArn });
    new ssm.StringParameter(this, 'LogGroupParam1', { parameterName: '/ecs/cdk-ecspresso/'+ context.app1.name , stringValue: logGroup1.logGroupName });
    // app2
    new ssm.StringParameter(this, 'ContainerSubnetApp2a', { parameterName: '/ecs/cdk-ecspresso/subnet-' + context.app2.name + '-a', stringValue: priavteSubnetIdList[2] });
    new ssm.StringParameter(this, 'ContainerSubnetApp2c', { parameterName: '/ecs/cdk-ecspresso/subnet-' + context.app2.name + '-c', stringValue: priavteSubnetIdList[3] });
    new ssm.StringParameter(this, 'ContainerSgParam2', { parameterName: '/ecs/cdk-ecspresso/sg-id-' + context.app2.name, stringValue: containerSg2.securityGroupId });
    new ssm.StringParameter(this, 'ContainerTgParam2', { parameterName: '/ecs/cdk-ecspresso/tg-arn-' + context.app2.name, stringValue: containerTg2.targetGroupArn });
    new ssm.StringParameter(this, 'LogGroupParam2', { parameterName: '/ecs/cdk-ecspresso/'+ context.app2.name , stringValue: logGroup2.logGroupName });
    // app3
    new ssm.StringParameter(this, 'ContainerSubnetApp3a', { parameterName: '/ecs/cdk-ecspresso/subnet-' + context.app3.name + '-a', stringValue: priavteSubnetIdList[4] });
    new ssm.StringParameter(this, 'ContainerSubnetApp3c', { parameterName: '/ecs/cdk-ecspresso/subnet-' + context.app3.name + '-c', stringValue: priavteSubnetIdList[5] });
    new ssm.StringParameter(this, 'ContainerSgParam3', { parameterName: '/ecs/cdk-ecspresso/sg-id-' + context.app3.name, stringValue: containerSg3.securityGroupId });
    new ssm.StringParameter(this, 'ContainerTgParam3', { parameterName: '/ecs/cdk-ecspresso/tg-arn-' + context.app3.name, stringValue: containerTg3.targetGroupArn });
    new ssm.StringParameter(this, 'LogGroupParam3', { parameterName: '/ecs/cdk-ecspresso/'+ context.app3.name , stringValue: logGroup3.logGroupName });
  }
}