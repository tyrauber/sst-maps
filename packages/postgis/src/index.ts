import * as path from "path";
import * as fs from "fs";
import fastify, { FastifyInstance,  FastifyRequest, FastifyReply, } from "fastify";
import awsLambdaFastify from '@fastify/aws-lambda';
import { fastifyPostgres } from '@fastify/postgres';
import fp from 'fastify-plugin'
import { type FastifyPluginAsync } from 'fastify'

require("dotenv").config();

const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 3000;
const host = process.env.SERVER_HOST || '0.0.0.0';

let logger: boolean | { level: string, file?: string } = false;
if ("SERVER_LOGGER" in process.env) {
  logger = process.env.SERVER_LOGGER === "true" ? { level: 'info' } : { level: process.env.SERVER_LOGGER ?? 'info' };
  if ("SERVER_LOGGER_PATH" in process.env) {
    logger.file = process.env.SERVER_LOGGER_PATH;
  }
}

// const docsPlugin: FastifyPluginAsync = async (server) => {
//   // INITIALIZE SWAGGER
//   await server.register(require('@fastify/swagger'), {
//     exposeRoute: true,
//     hideUntagged: true,
//     swagger: {
//       basePath: `${process.env.BASE_PATH || '/v1'}`,
//       info: {
//         title: 'PostGIS HTTP API',
//         description: 'PostGIS HTTP API ',
//         version: process.env.npm_package_version || '',
//       },
//       // externalDocs: {
//       //   url: 'https://github.com/tobinbradley/dirt-simple-postgis-http-api',
//       //   description: 'Source code on Github',
//       // },
//       tags: [
//         {
//           name: 'api',
//           description: 'code related end-points',
//         },
//         {
//           name: 'feature',
//           description: 'features in common formats for direct mapping.',
//         },
//         {
//           name: 'meta',
//           description: 'meta information for tables and views.',
//         },
//       ],
//     },
//   })

//   // SWAGGER UI
//   await server.register(require('@fastify/swagger-ui'), {
//     routePrefix: `${process.env.BASE_PATH || '/v1'}/`,
//   })
// }

const app = fastify({ 
  logger: logger,
  ajv: {
    customOptions: {
      coerceTypes: 'array'
    }
  }
});

if (!("POSTGRES_CONNECTION" in process.env)) {
  throw new Error("Required ENV variable POSTGRES_CONNECTION is not set. Please see README.md for more information.");
}

// POSTGRES CONNECTION
//const pem =  fs.readFileSync(path.join(__dirname, './global-bundle.pem')).toString();
const postgresOptions = {
  connectionString: process.env.POSTGRES_CONNECTION,
  ssl: {
    ssl: true,
    rejectUnauthorized: false,
   // ca: pem
  }
};
app.register(fastifyPostgres, postgresOptions);

// app.get('/v1/postgis/help', async function (req: FastifyRequest, reply: FastifyReply) {
//     const client = await app.pg.pool.connect();
//     try {
//         const res = await client.query('SELECT * FROM pg_catalog.pg_tables');
//         reply.send(res.rows);
//     } finally {
//         client.release(true);
//     }
// })

// COMPRESSION
// add x-protobuf
const compressOptions = {
  customTypes: /x-protobuf$/,
  forceRequestEncoding: 'gzip',
  requestEncodings: ['gzip']
};

app.register(
  require('@fastify/compress'),
  compressOptions
);

const fastifyCaching = require('@fastify/caching');
// app.register(
//   fastifyCaching,
//   {privacy: fastifyCaching.privacy.NOCACHE}
// )
// CACHE SETTINGS
const cachingOptions = {
  privacy: process.env.CACHE_PRIVACY || 'private',
  expiresIn: process.env.CACHE_EXPIRESIN || 3600,
  serverExpiresIn: process.env.CACHE_SERVERCACHE
};
app.register(
  fastifyCaching, cachingOptions
);

// CORS
const corsOptions = {};
app.register(require('@fastify/cors'), corsOptions);

// OPTIONAL RATE LIMITER
if ("RATE_MAX" in process.env) {
  const rateLimitOptions = {
    max: Number(process.env.RATE_MAX),
    timeWindow: '1 minute'
  };
  app.register(import('@fastify/rate-limit'), rateLimitOptions);
}

// app.register(fp(docsPlugin))

// ADD ROUTES
app.register(require('@fastify/autoload'), {
    dir: path.join(__dirname, 'routes'),
})

if (require.main === module) {
  app.listen({ port: 3000 }, (err: Error) => {
      if (err) console.error(err);
          console.log('server listening on 3000');
  });
} else {
  module.exports = app;
}
