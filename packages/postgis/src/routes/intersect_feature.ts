import { FastifyInstance, FastifyRequest, FastifyReply, RouteOptions } from 'fastify';
import { PoolClient } from 'pg';

// route schema
const schema = {
  description: 'Transform a point to a different coordinate system.',
  tags: ['api'],
  summary: 'transform point to new SRID',
  params: {
    table_from: {
      type: 'string',
      description: 'Table to use as an overlay.',
    },
    table_to: {
      type: 'string',
      description: 'Table to be intersected.',
    },
  },
  querystring: {
    geom_column_from: {
      type: 'string',
      description: 'The geometry column of the from_table. The default is geom.',
      default: 'geometry',
    },
    geom_column_to: {
      type: 'string',
      description: 'The geometry column of the to_table. The default is geom.',
      default: 'geometry',
    },
    columns: {
      type: 'string',
      description:
        'Columns to return. Columns should be prefaced by the table name if the column name exists in both tables (ex: f.pid, t.prkname). The default is all columns.',
      default: '*',
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.',
    },
    distance: {
      type: 'integer',
      description: 'Buffer the overlay feature(s) by units of the geometry column.',
      default: 0,
    },
    sort: {
      type: 'string',
      description: 'Optional sort column(s).',
    },
    limit: {
      type: 'integer',
      description: 'Optional limit to the number of output features.',
    },
  },
};

type Params = {
  [key in keyof typeof schema.params]: typeof schema.params[key]['type'];
};

type Query = {
  [key in keyof typeof schema.querystring]: typeof schema.querystring[key]['type'];
};

// route query
const sql = (params: Params, query: Query) => {
  return `
  SELECT
    ${query.columns}

  FROM
    ${params.table_from},
    ${params.table_to}

  WHERE
    ST_DWithin(
      ${params.table_from}.${query.geom_column_from},
      ${params.table_to}.${query.geom_column_to},
      ${query.distance}
    )
    -- Optional Filter
    ${query.filter ? `AND ${query.filter}` : '' }

  -- Optional sort
  ${query.sort ? `ORDER BY ${query.sort}` : '' }

  -- Optional limit
  ${query.limit ? `LIMIT ${query.limit}` : '' }
  `;
};

// Create route
export default function (fastify: FastifyInstance, opts: RouteOptions, next: () => void) {
  fastify.route({
    method: 'GET',
    url: '/intersect_feature/:table_from/:table_to',
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