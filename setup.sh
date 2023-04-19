#!/bin/sh
source .env
aws s3 mb s3://$AWS_BUCKET --region $AWS_REGION --profile $AWS_PROFILE
aws s3 sync ./packages/nextjs/public/tiles s3://$AWS_BUCKET/tiles --region $AWS_REGION --profile $AWS_PROFILE