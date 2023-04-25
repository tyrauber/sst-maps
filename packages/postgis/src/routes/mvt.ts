import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import zlib from "zlib";

// route schema
const schema = {
  description:
    'Return table as Mapbox Vector Tile (MVT). The layer name returned is the name of the table.',
  tags: ['feature'],
  summary: 'return MVT',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.',
    },
    z: {
      type: 'integer',
      description: 'Z value of ZXY tile.',
    },
    x: {
      type: 'integer',
      description: 'X value of ZXY tile.',
    },
    y: {
      type: 'integer',
      description: 'Y value of ZXY tile.',
    },
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'Optional geometry column of the table. The default is geom.',
      default: 'geometry',
    },
    columns: {
      type: 'string',
      description: 'Optional columns to return with MVT. The default is no columns.',
    },
    id_column: {
      type: 'string',
      description:
        'Optional id column name to be used with Mapbox GL Feature State. This column must be an integer or a string cast as an integer.',
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

// route query
const sql = (params: Params, query: Query) => {
  return `
    WITH mvtgeom as (
      SELECT
        ST_AsMVTGeom (
          ST_Transform(${query.geom_column}, 3857),
          ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
        ) as geom
        ${query.columns ? `, ${query.columns}` : ''}
        ${query.id_column ? `, ${query.id_column}` : ''}
      FROM
        ${params.table},
        (SELECT ST_SRID(${query.geom_column}) AS srid FROM ${params.table} WHERE ${query.geom_column} IS NOT NULL LIMIT 1) a
      WHERE
        ST_Intersects(
          ${query.geom_column},
          ST_Transform(
            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
            srid
          )
        )

        -- Optional Filter
        ${query.filter ? ` AND ${query.filter}` : ''}
    )
    SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${
    query.id_column ? `, '${query.id_column}'` : ''
  }) AS mvt from mvtgeom;
  `;
};

// create route
const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/mvt/:table/:z/:x/:y.pbf',
    schema: schema,
    handler: async function (request: FastifyRequest, reply: FastifyReply) {
      const { params, query } = request;
      const queryString = query as Query;
      const paramsObject = params as Params;
      const sqlQuery = sql(paramsObject, queryString);
      const client = await fastify.pg.pool.connect();
      try {
          const result = await client.query(sqlQuery);
          try{
            if(result.rows[0] && result.rows[0].mvt){
              reply.header('Content-Type', 'application/vnd.mapbox-vector-tile');
              reply.header('Content-Encoding', 'gzip');
              return zlib.gzipSync(Buffer.from(result.rows[0].mvt));
            } else {
              reply.code(204).send();
            }
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