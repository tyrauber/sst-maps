import {  FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply, RouteOptions, FastifyPluginOptions } from 'fastify';

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.route({
    method: 'GET',
    url: '/help',
    handler:  async function (request: FastifyRequest, reply: FastifyReply) {
        const client = await fastify.pg.pool.connect();
        try {
            const res = await client.query('SELECT * FROM pg_catalog.pg_tables');
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