import {  FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply, RouteOptions, FastifyPluginOptions } from 'fastify';
import { PoolClient } from 'pg';

// Route schema
const schema = {
  description: 'List tables and views. Note the service user needs read permission on the geometry_columns view.',
  tags: ['meta'],
  summary: 'list tables',
  params: {},
  querystring: {
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

// route query
const sql = (params: Params, query: Query) => {  return `
    SELECT
      i.table_name,
      i.table_type,
      g.f_geometry_column as geometry_column,
      g.coord_dimension,
      g.srid,
      g.type
    FROM
      information_schema.tables i
    LEFT JOIN geometry_columns g
    ON i.table_name = g.f_table_name
    WHERE
      i.table_schema not in  ('pg_catalog', 'information_schema')

      -- Optional where filter
      ${query.filter ? `and ${query.filter}` : '' }

    ORDER BY table_name
  `;
};

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/list_tables',
    schema: schema,
    handler:  async function (request: FastifyRequest, reply: FastifyReply) {
      
      const { params, query } = request;
      const queryString = query as Query;
      const paramsObject = params as Params;

      const client = await fastify.pg.pool.connect();
        try {
            const res = await client.query(sql(paramsObject, queryString));
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

export default example;
export const autoPrefix = process.env.BASE_PATH || "/v1";