import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

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

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/query/:table',
    schema: schema,
    handler:  async function (request: FastifyRequest, reply: FastifyReply) {

      const { params, query } = request;
      const queryString = query as Query;
      const paramsObject = params as Params;

      const client = await fastify.pg.pool.connect();
        try {
            const res = await client.query( sql(paramsObject, queryString));
            return res.rows;
        } catch (e){
            console.log(e)
            return e;
        } finally {
            client.release(true);
        }
    }
  });
};

export default route;
export const autoPrefix = process.env.BASE_PATH || "/v1";