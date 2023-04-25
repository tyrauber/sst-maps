import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

// route schema
const schema = {
  description: 'Return table as GeoJSON.',
  tags: ['feature'],
  summary: 'return GeoJSON',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
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
      description: 'Columns to return as GeoJSON properites. The default is no columns. <br/><em>Note: the geometry column should not be listed here, and columns must be explicitly named.</em>'
    },
    id_column: {
      type: 'string',
      description:
        'Optional id column name to be used with Mapbox GL Feature State. This column must be an integer a string cast as an integer.'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    bounds: {
      type: 'array',
      // type: 'string',
      // pattern: '^-?[0-9]{0,20}.?[0-9]{1,20}?(,-?[0-9]{0,20}.?[0-9]{1,20}?){2,3}$',
      description: 'Optionally limit output to features that intersect bounding box. Can be expressed as a bounding box (sw.lng, sw.lat, ne.lng, ne.lat) or a Z/X/Y tile (0,0,0).'
    },
    precision: {
      type: 'integer',
      description: 'The maximum number of decimal places to return. Default is 9.',
      default: 9
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

  let { bounds } = query;
  return `
    SELECT
      jsonb_build_object(
        'type',       'Feature',
        ${
          query.id_column ? `'id', ${query.id_column},` : ''
        }
        'geometry',   ST_AsGeoJSON(geom, ${parseInt(String(query.precision), 10)})::jsonb,
        'properties', to_jsonb( subq.* ) - 'geom' ${ query.id_column ? `- '${query.id_column}'` : '' }
      ) AS geojson

    FROM (
      SELECT
        ST_Transform(${query.geom_column}, 4326) as geom
        ${query.columns ? `, ${query.columns}` : ''}
        ${ query.id_column ? `, ${query.id_column}` : '' }
      FROM
        ${params.table},
        (SELECT ST_SRID(${query.geom_column}) AS srid FROM ${params.table} WHERE ${query.geom_column} IS NOT NULL LIMIT 1) a
      ${query.filter || bounds ? 'WHERE' : ''}
        ${query.filter ? `${query.filter}` : ''}
        ${query.filter && bounds ? 'AND' : ''}
        ${bounds && bounds.length === 4 ?
          `${query.geom_column} &&
          ST_Transform(
            ST_MakeEnvelope(${bounds}, 4326),
            srid
          )
          `
          : ''
        }
        ${bounds && bounds.length === 3 ?
          `${query.geom_column} &&
          ST_Transform(
            ST_TileEnvelope(${bounds}),
            srid
          )
          `
          : ''
        }
    ) as subq
  `
}

interface PgRow {
  geojson: JSON
}

// create route
const route: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/geojson/:table',
    schema: schema,
    handler: async function (request: FastifyRequest, reply: FastifyReply) {
      const { params, query } = request;
      const queryString = query as Query;
      const paramsObject = params as Params;

      const client = await fastify.pg.pool.connect();
      try {
          const result = await client.query(sql(paramsObject, queryString));
          try{
            const json = {
              type: 'FeatureCollection',
              features: result.rows.map((el: PgRow) => el.geojson)
            }
            return json
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