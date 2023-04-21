import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfront_origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { use, StackContext, NextjsSite } from 'sst/constructs';
import { Api } from './Api';
import { Bucket } from './Bucket';
import {
    Function,
    FunctionCode,
    FunctionEventType,
  } from 'aws-cdk-lib/aws-cloudfront'

dotenv.config();

import {
    ViewerProtocolPolicy,
    AllowedMethods,
} from "aws-cdk-lib/aws-cloudfront";

export function Next({ stack }: StackContext) {
    const bucket = use(Bucket);
    const api = use(Api);

    const data = fs.readFileSync(path.resolve('./packages/functions/src/jwt.js'), 'utf8');
    const verifyJWT = new Function(stack, 'JWT_AUTH', {
        code: FunctionCode.fromInline(`
        // JWT OPTIONS:
        var JWT_SESSION_ID = "${process.env.JWT_SESSION_ID || '_sst_maps_session_id'}";
        var JWT_SECRET_KEY = "${process.env.JWT_SECRET_KEY || 'SUPER_SECRET_KEY_THAT_SHOULD_BE_CHANGED'}";
        var JWT_PAYLOAD =  "${process.env.JWT_PAYLOAD || "{'exp': '3600'}"}";
        // iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expiration Time', nbf: 'Not Before', iat: 'Issued At', jti: 'JWT ID', etc.
        ${data}
    `),
    })

    const site = new NextjsSite(stack, "Site", {
        path: "packages/nextjs",
        environment: {
            DEFAULT_TILES: process.env.DEFAULT_TILES,
            //API_URL: api.url,
            //BUCKET_NAME: bucket.bucketName,
        },
        cdk:{
            distribution:{
                additionalBehaviors: {
                    'v1/*': {
                        origin: new cloudfront_origins.HttpOrigin(cdk.Fn.parseDomainName(api.url)),
                        viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
                        allowedMethods: AllowedMethods.ALLOW_ALL,
                        functionAssociations: [
                            {
                                function: verifyJWT,
                                eventType: FunctionEventType.VIEWER_REQUEST,
                            },
                            {
                                function: verifyJWT,
                                eventType: FunctionEventType.VIEWER_RESPONSE,
                            },
                        ],
                    },
                  },
            }
        },
        bind: [api],
    });
    stack.addOutputs({
        WEB_URL: site.url
    });
    
}
