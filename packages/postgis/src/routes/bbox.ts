import fastify, { FastifyInstance, FastifyRequest, FastifyReply, RouteOptions } from 'fastify';
import { PoolClient } from 'pg';

// Route schema
const schema = {
  description: 'Gets the bounding box of a feature(s).',
  tags: ['api'],
  summary: 'minimum bounding rectangle',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view to query.',
    },
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'The geometry column of the table.',
      default: 'geometry',
    },
    srid: {
      type: 'integer',
      description: 'The SRID for the returned centroid. The default is <em>4326</em> WGS84 Lat/Lng.',
      default: 4326,
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.',
    },
  },
};

type Params = {
  [key in keyof typeof schema.params]: typeof schema.params[key]['type'];
};

type Query = {
  [key in keyof typeof schema.querystring]: typeof schema.querystring[key]['type'];
};

// Route query
const sql = (params: Params, query: Query) => {
  return `
    SELECT
      ST_Extent(ST_Transform(${query.geom_column}, ${query.srid})) as bbox

    FROM
      ${params.table}

    -- Optional where filter
    ${query.filter ? `WHERE ${query.filter}` : ''}
  `;
};

// Create route
export default function (fastify: FastifyInstance, opts: RouteOptions, next: () => void) {
  fastify.route({
    method: 'GET',
    url: '/bbox/:table',
    schema: schema,
    handler: function (request: FastifyRequest, reply: FastifyReply) {

      const { params, query } = request;
      const queryString = query as Query;
      const paramsObject = params as Params;

      fastify.pg.connect(onConnect);

      function onConnect(
        err: Error | null,
        client: PoolClient,
        release: () => void
      ): void {
        if (err) {
          request.log.error(err);
          reply.code(500).send({ error: 'Database connection error.' });
          return;
        }
      
        client.query(
          sql(paramsObject, queryString),
          function onResult(err: Error | null, result: { rows: any[] }) {
            release();
            reply.send(err || result.rows);
          }
        );
      }
    }
  });
  next();
}

export const autoPrefix = process.env.BASE_PATH || "/v1";