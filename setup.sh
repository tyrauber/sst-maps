#!/bin/sh
source .env
aws s3 mb s3://$S3_BUCKET --region $S3_REGION
aws s3 sync ./packages/nextjs/public/tiles s3://$S3_BUCKET/tiles --region $S3_REGION