import { Bucket } from './Bucket';
import { use, StackContext, Function, Api as ApiGateway } from "sst/constructs";

export function Api({ stack }: StackContext) {
    const bucket = use(Bucket);
    const api = new ApiGateway(stack, "Api", {
        authorizers: {
          lambda: {
            type: "lambda",
            responseTypes: ["simple"],
            function: new Function(stack, "Authorizer", {
                handler: "packages/functions/src/authorizer.main",
            }),
          },
        },
        defaults: {
            function: {
                authorizer: "lambda",
                environment: { 
                    BUCKET: bucket.bucketName, 
                    PMTILES_PATH: "tiles/{name}.pmtiles"
                },
                permissions: [bucket],
            }
        },
        routes: {
            "GET /v1/private": {
                function: "packages/functions/src/private.main",
                authorizer: "lambda",
            },
            "GET /v1/public": {
                function: "packages/functions/src/public.main",
                authorizer: "none",
            },
            "GET /v1/tiles/{proxy+}":{
                function: "packages/functions/src/tiles.main",
                authorizer: "none",
            },
            // $default: {
            //     function: "packages/functions/src/tiles.main",
            //     authorizer: "none",
            // },
        }
    });

    stack.addOutputs({
        API_URL: api.url
    });

    return api;
}
