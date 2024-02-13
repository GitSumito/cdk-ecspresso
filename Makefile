install:
	npm install @aws-cdk/core --save
	npm install -g aws-cdk
diff-dev:
	cdk diff CdkEcspressoStack -c env=dev
diff-prd:
	cdk diff CdkEcspressoStack -c env=prd