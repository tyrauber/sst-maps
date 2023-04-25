import { FastifyInstance, FastifyRequest, FastifyReply, RouteOptions } from 'fastify';
import { PoolClient } from 'pg';


// route schema
const schema = {
  description: 'Return records as Geobuf, a protobuf encoding of GeoJSON.',
  tags: ['feature'],
  summary: 'return Geobuf',
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
      description:
        'Columns to return as GeoJSON properites. The default is geometry only. <br/><em>Note: the geometry column should not be listed here, and columns must be explicitly named.</em>'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    bounds: {
      type: 'string',
      pattern:
        '^-?[0-9]{0,20}.?[0-9]{1,20}?(,-?[0-9]{0,20}.?[0-9]{1,20}?){2,3}$',
      description:
        'Optionally limit output to features that intersect bounding box. Can be expressed as a bounding box (sw.lng, sw.lat, ne.lng, ne.lat) or a Z/X/Y tile (0,0,0).'
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
        ST_AsGeobuf(q, 'geom')

      FROM
      (

        SELECT
          ST_Transform(${query.geom_column}, 4326) as geom
          ${query.columns ? `, ${query.columns}` : ''}

        FROM
          ${params.table}
          ${
            bounds
              ? `, (SELECT ST_SRID(${query.geom_column}) AS srid FROM ${params.table} WHERE ${query.geom_column} IS NOT NULL LIMIT 1) sq`
              : ''
          }

        -- Optional Filter
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

      ) as q;
    `
}

// Create route
export default function (fastify: FastifyInstance, opts: RouteOptions, next: () => void) {
  fastify.route({
    method: 'GET',
    url: '/geobuf/:table',
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
            if (!result.rows[0].st_asgeobuf) {
              reply.code(204).send()
            }
            reply
              .header('Content-Type', 'application/x-protobuf')
              .send(result.rows[0].st_asgeobuf)
          }
        );
      }
    }
  });
  next();
}

export const autoPrefix = process.env.BASE_PATH || "/v1";