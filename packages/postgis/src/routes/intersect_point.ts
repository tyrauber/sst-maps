import { FastifyInstance, FastifyRequest, FastifyReply, RouteOptions } from 'fastify';
import { PoolClient } from 'pg';

// route schema
const schema = {
  description: 'Transform a point to a different coordinate system.',
  tags: ['api'],
  summary: 'transform point to new SRID',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.',
    },
    point: {
      type: 'string',
      pattern: '^((-?\\d+\\.?\\d+)(,-?\\d+\\.?\\d+)(,[0-9]{4}))',
      description: 'A point expressed as <em>X,Y,SRID</em>. Note for Lng/Lat coordinates, Lng is X and Lat is Y.',
    },
  },
  querystring: {
    geom_column: {
      type: 'string',
      description: 'The geometry column of the table.',
      default: 'geometry',
    },
    columns: {
      type: 'string',
      description: 'Columns to return.',
      default: '*',
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.',
    },
    distance: {
      type: 'integer',
      description: 'Buffer the overlay feature(s) by units of the geometry column.',
      default: 0,
    },
    sort: {
      type: 'string',
      description: 'Optional sort column(s).',
    },
    limit: {
      type: 'integer',
      description: 'Optional limit to the number of output features.',
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
  const { point } = params;
  if (typeof point === 'string') {

    const regex = new RegExp(schema.params.point.pattern);
    const match = (point as string).match(regex);
    if (match) {
        const [x, y, srid] = match[0].split(',');
        return `
          SELECT
            ${query.columns}

          FROM
            ${params.table}

          WHERE
            ST_DWithin(
              ${query.geom_column},
              ST_Transform(
                st_setsrid(
                  st_makepoint(${x}, ${y}),
                  ${srid}
                ),
                (SELECT ST_SRID(${query.geom_column}) FROM ${params.table} LIMIT 1)
              ),
              ${query.distance}
            )
            -- Optional Filter
            ${query.filter ? `AND ${query.filter}` : '' }

          -- Optional sort
          ${query.sort ? `ORDER BY ${query.sort}` : '' }

          -- Optional limit
          ${query.limit ? `LIMIT ${query.limit}` : '' }
          `;
    }
  }
  return '';
};

// Create route
export default function (fastify: FastifyInstance, opts: RouteOptions, next: () => void) {
  fastify.route({
    method: 'GET',
    url: '/intersect_point/:table/:point',
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