import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

// Route schema
const schema = {
  description: 'Returns a list of columns in the specified table.',
  tags: ['meta'],
  summary: 'list table columns',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view to query.',
    },
  },
};

type Params = {
  [key in keyof typeof schema.params]: typeof schema.params[key]['type'];
};


// route query
const sql = (params: Params) => {
  return `
    SELECT
      attname as field_name,
      typname as field_type

    FROM
      pg_namespace, pg_attribute, pg_type, pg_class

    WHERE
      pg_type.oid = atttypid AND
      pg_class.oid = attrelid AND
      relnamespace = pg_namespace.oid AND
      attnum >= 1 AND
      relname = '${params.table}'
  `;
};

const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/list_columns/:table',
    schema: schema,
    handler:  async function (request: FastifyRequest, reply: FastifyReply) {

      const { params, query } = request;
      const paramsObject = params as Params;

      const client = await fastify.pg.pool.connect();
        try {
            const res = await client.query(sql(paramsObject));
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