export async function main(event) {
    console.log(event)
    return {
        statusCode: 200,
        body: `Hello stranger!\n${JSON.stringify(event.queryStringParameters)}`,
    };
}