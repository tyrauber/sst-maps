import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

// route schema
const schema = {
  description: 'Get the centroids of feature(s).',
  tags: ['api'],
  summary: 'feature(s) centroids',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view to query.'
    }
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'The geometry column of the table.',
      default: 'geometry',
    },
    srid: {
      type: 'integer',
      description: 'The SRID for the returned centroids.',
      default: 4326
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    force_on_surface: {
      type: 'boolean',
      description: 'Set <em>true</em> to force point on surface. The default is <em>false</em>.',
      default: false
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
  return `
  SELECT
    -- Get X and Y of (potentially) geographically transformed geometry
    ST_X(
      ST_Transform(
        ${query.force_on_surface ? 'ST_PointOnSurface' : 'ST_Centroid'}(
          ${query.geom_column}
        ), ${query.srid})
    ) as x,
    ST_Y(
      ST_Transform(
        ${query.force_on_surface ? 'ST_PointOnSurface' : 'ST_Centroid'}(
          ${query.geom_column}
        ), ${query.srid})
    ) as y

  FROM
    ${params.table}

  -- Optional filter
  ${query.filter ? `WHERE ${query.filter}` : ''}
  `
}

// create route
const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/centroid/:table',
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
