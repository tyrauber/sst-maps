import fastify, { FastifyInstance, FastifyRequest, FastifyReply, RouteShorthandOptions } from 'fastify';
import { PoolClient } from 'pg';

const schema = {
  description: 'Query a table or view.',
  tags: ['api'],
  summary: 'table query',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.',
    },
  },
  querystring: {
    columns: {
      type: 'string',
      description: 'Columns to return.',
      default: '*',
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.',
    },
    sort: {
      type: 'string',
      description: 'Optional sort by column(s).',
    },
    limit: {
      type: 'integer',
      description: 'Optional limit to the number of output features.',
      default: 100,
    },
    group: {
      type: 'string',
      description: 'Optional column(s) to group by.',
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
      ${params.table}
    -- Optional Filter
    ${query.filter ? `WHERE ${query.filter}` : ''}
    -- Optional Group
    ${query.group ? `GROUP BY ${query.group}` : ''}
    -- Optional sort
    ${query.sort ? `ORDER BY ${query.sort}` : ''}
    -- Optional limit
    ${query.limit ? `LIMIT ${query.limit}` : ''}
  `;
};

// Create route
export default function (fastify: FastifyInstance, opts: RouteShorthandOptions, next: () => void) {
  fastify.route({
    method: 'GET',
    url: '/query/:table',
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