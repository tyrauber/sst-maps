import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

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

// create route
const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/bbox/:table',
    schema: schema,
    handler: async function (request: FastifyRequest, reply: FastifyReply) {
      const { params, query } = request;
      const queryString = query as Query;
      const paramsObject = params as Params;

      const client = await fastify.pg.pool.connect();
      try {
          const result = await client.query(sql(paramsObject, queryString));
          try{
            return result.rows
          } catch (e){
            reply.code(204).send();
          }
      } finally {
        client.release(true);
      }
    },
  });
}
export default route;
export const autoPrefix = process.env.BASE_PATH || "/v1";
