import fastify, { FastifyInstance, FastifyRequest, FastifyReply, RouteShorthandOptions } from 'fastify';
import { PoolClient } from 'pg';

// route schema
const schema = {
  description: 'Find the records closest to a point in order of distance. Note that if no limit if given, all records are returned.',
  tags: ['api'],
  summary: 'records closest to point',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
    },
    point: {
      type: 'string',
      pattern: '^((-?\\d+\\.?\\d+)(,-?\\d+\\.?\\d+)(,[0-9]{4}))',
      description: 'A point expressed as <em>X,Y,SRID</em>. Note for Lng/Lat coordinates, Lng is X and Lat is Y.'
    }
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'The geometry column of the table.',
      default: 'geometry',
    },
    columns: {
      type: 'string',
      description: 'Columns to return.',
      default: '*'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    limit: {
      type: 'integer',
      description: 'Limit the number of output features.',
      default: 10
    }
  }
}
type Params = {
  [key in keyof typeof schema.params]: typeof schema.params[key]['type'];
};

type Query = {
  [key in keyof typeof schema.querystring]: typeof schema.querystring[key]['type'];
};

// route query
const sql = (params: Params, query: Query) => {
  const { point } = params;

  if (typeof point === 'string') {

    const regex = new RegExp(schema.params.point.pattern);
    const match = (point as string).match(regex);

    if (match) {
      const [x, y, srid] = match[0].split(',');

      return `
        SELECT
          ${query.columns},
          ST_Distance(
            ST_Transform(
              st_setsrid(st_makepoint(${x}, ${y}), ${srid}),
              (SELECT ST_SRID(${query.geom_column}) FROM ${params.table} LIMIT 1)
            ),
            ${query.geom_column}
          ) as distance

        FROM
        ${params.table}

        -- Optional Filter
        ${query.filter ? `WHERE ${query.filter}` : '' }

        ORDER BY
          ${query.geom_column} <-> ST_Transform(
            st_setsrid(st_makepoint(${x}, ${y}), ${srid}),
            (SELECT ST_SRID(${query.geom_column}) FROM ${params.table} LIMIT 1)
          )

        LIMIT
        `;
    }
  }

  return '';
}

// Create route
export default function (fastify: FastifyInstance, opts: RouteShorthandOptions, next: () => void) {
  fastify.route({
    method: 'GET',
    url: '/nearest/:table/:point',
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
