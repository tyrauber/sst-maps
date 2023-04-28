import { Bucket } from './Bucket';
import { use, StackContext, Function, Api as ApiGateway } from "sst/constructs";

export function Api({ stack }: StackContext) {
    const bucket = use(Bucket);
    const api = new ApiGateway(stack, "Api", {
        defaults: {
            function: {
                environment: { 
                    BUCKET: bucket.bucketName, 
                    PMTILES_PATH: "tiles/{name}.pmtiles"
                },
                permissions: [bucket],
            }
        },
        routes: {
            // "GET /v1/public/{proxy+}": {
            //     function: "packages/functions/src/public.main"
            // },
            "GET /v1/tiles/{proxy+}":{
                function: "packages/functions/src/tiles.main"
            },
            "GET /v1/postgis/{proxy+}":{
                function: {
                    handler: "packages/functions/src/postgis.handler",
                    environment: {
                        POSTGRES_CONNECTION: process.env.POSTGRES_CONNECTION,
                        BASE_PATH: "/v1/postgis",
                        // CACHE_EXPIRESIN: 3600,
                        // CACHE_SERVERCACHE: 3600
                    },
                    copyFiles: [
                        //{"from": "./packages/postgis/dist/static", "to": "packages/postgis/src/static"},
                        {"from": "./packages/postgis/dist/routes", "to": "packages/functions/src/routes"},
                        //{"from": "./packages/postgis/dist/global-bundle.pem", "to": "packages/postgis/src/global-bundle.pem"},
                    ]
                }
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
