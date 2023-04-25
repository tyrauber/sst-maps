
import app from "@sst-maps/postgis";
import awsLambdaFastify from '@fastify/aws-lambda'
export const handler = awsLambdaFastify(app)
await app.ready()