import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

// route schema
const schema = {
  description: 'Transform a point to a different coordinate system.',
  tags: ['api'],
  summary: 'transform point to new SRID',
  params: {
    point: {
      type: 'string',
      pattern: '^((-?\\d+\\.?\\d+)(,-?\\d+\\.?\\d+)(,[0-9]{4}))',
      description: 'A point expressed as <em>X,Y,SRID</em>. Note for Lng/Lat coordinates, Lng is X and Lat is Y.'
    }
  },
  querystring: {
    srid: {
      type: 'integer',
      description: 'The SRID of the coordinate system to return the point in.',
      default: 4326
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
        ST_X(
          ST_Transform(
            st_setsrid(
              st_makepoint(${x}, ${y}),
              ${srid}
            ),
            ${query.srid}
          )
        ) as x,
        ST_Y(
          ST_Transform(
            st_setsrid(
              st_makepoint(${x}, ${y}),
              ${srid}
            ),
            ${query.srid}
          )
        ) as y
      `
    }
  }
  return '';
};

// create route
const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/transform_point/:point',
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

export default route;
export const autoPrefix = process.env.BASE_PATH || "/v1";