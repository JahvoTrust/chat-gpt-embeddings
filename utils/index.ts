import { OpenAIModel } from "@/types";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import { Configuration, OpenAIApi } from "azure-openai";

loadEnvConfig("");

export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const OpenAIStream = async (prompt: string, apiKey: string) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const configuration = new Configuration({    
    // add azure info into configuration
    azure: {
       apiKey: process.env.OPENAI_API_KEY,
       endpoint: process.env.OPENAI_API_BASE,
       // deploymentName is optional, if you donot set it, you need to set it in the request parameter
       deploymentName: process.env.OPENAI_API_EMBEDDING_NAME,
    }
  });
  
  const openai = new OpenAIApi(configuration);
  const promptmessage = [
    {
      role: "system",
      content: "You are a helpful assistant that accurately answers queries using Paul Graham's essays. Use the text provided to form your answer, but avoid copying word-for-word from the essays. Try to use your own words when possible. Keep your answer under 5 sentences. Be accurate, helpful, concise, and clear."
    },
    {
      role: "user",
      content: prompt
    }
  ]

  const res = await openai.createCompletion({
    model: OpenAIModel.DAVINCI_TURBO,
    prompt: promptmessage,
    max_tokens: 150,
    temperature: 0.0,
    stream: true,
    // topP: 1,
    // presencePenalty: 0,
    // frequencyPenalty: 0,
    // bestOf: 1,
  });

  // const res = await fetch("https://api.openai.com/v1/chat/completions", {
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${apiKey}`
  //   },
  //   method: "POST",
  //   body: JSON.stringify({
  //     model: OpenAIModel.DAVINCI_TURBO,
  //     messages: [
  //       {
  //         role: "system",
  //         content: "You are a helpful assistant that accurately answers queries using Paul Graham's essays. Use the text provided to form your answer, but avoid copying word-for-word from the essays. Try to use your own words when possible. Keep your answer under 5 sentences. Be accurate, helpful, concise, and clear."
  //       },
  //       {
  //         role: "user",
  //         content: prompt
  //       }
  //     ],
  //     max_tokens: 150,
  //     temperature: 0.0,
  //     stream: true
  //   })
  // });

  if (res.status !== 200) {
    throw new Error("OpenAI API returned an error");
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.data as any) {
        parser.feed(decoder.decode(chunk));
      }
    }
  });

  return stream;
};
