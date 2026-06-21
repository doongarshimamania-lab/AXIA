"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const predictDisputeOutcome = action({
  args: { 
    evidence: v.string(),
    clientContext: v.optional(v.string()),
  },
  handler: async (ctx, { evidence, clientContext = "" }) => {
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = ChatPromptTemplate.fromTemplate(
      `Analyze this freelance dispute evidence and predict the likelihood of success (0-100 score).
Evidence: {evidence}
Client context: {clientContext}

Provide: Score (0-100), brief reasoning, and recommended next evidence type (screenshot/memo/URL).`
    );

    const chain = prompt.pipe(llm).pipe(new StringOutputParser());
    const result = await chain.invoke({ evidence, clientContext });
    return { prediction: result, timestamp: Date.now() };
  },
});
