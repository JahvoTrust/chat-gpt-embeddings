import { supabaseAdmin } from "@/utils";
import { Configuration, OpenAIApi } from "azure-openai";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");
export const config = {
  runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { query, matches  } = (await req.json()) as {
      query: string;
      // apiKey: string;
      matches: number;
  
    };

    const configuration = new Configuration({    
      // add azure info into configuration
      azure: {
         apiKey: process.env.OPENAI_API_KEY,
         endpoint: process.env.OPENAI_API_BASE,
         // deploymentName is optional, if you donot set it, you need to set it in the request parameter
         deploymentName: process.env.OPENAI_API_EMBEDDING_NAME,
      }
    });
    console.log("Key:"+process.env.OPENAI_API_KEY)

   
    const openai = new OpenAIApi(configuration);

    const input = query.replace(/\n/g, " ");

    const embeddingResponse = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: input
    });

    console.log(embeddingResponse.data.data)

    const [{ embedding }] = embeddingResponse.data.data;

    const { data: chunks, error } = await supabaseAdmin.rpc("pg_search", {
      query_embedding: embedding,
      similarity_threshold: 0.01,
      match_count: matches
    });

    if (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }

     return new Response(JSON.stringify(chunks), { status: 200 });
    // return new Response("", { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });

  }
};

export default handler;
