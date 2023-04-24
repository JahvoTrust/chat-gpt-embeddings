const handler = async (req: Request): Promise<Response> => {
    return new Response(JSON.stringify({id:"123123"}), { status: 200 });
}

export default handler;