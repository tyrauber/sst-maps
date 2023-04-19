import * as dotenv from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import * as s3 from "aws-cdk-lib/aws-s3";
import { Bucket as StackBucket, StackContext} from 'sst/constructs';

dotenv.config();

export function Bucket({ stack }: StackContext) {
    let bucket;
    if(!!(process.env.AWS_BUCKET)){
        bucket = s3.Bucket.fromBucketName(stack, "Bucket", process.env.AWS_BUCKET)
        stack.addOutputs({
            BUCKET: bucket.bucketName,
            BUCKET_ARN: bucket.bucketArn
        });
    }else {
       bucket = new StackBucket(stack, "Bucket", {});
    }
    return bucket;
}
