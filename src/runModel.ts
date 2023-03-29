import {
  addScoreToMemories,
  getKeyWords,
  getLongTermMems,
  getShortTermMems,
  getSummary,
  getVector,
  loadPairs,
} from "./fns.ts";
import { createMem, pythonProxy, saveMem } from "./fns2.ts";
import getConfigs from "./getConfigs.ts";
import { Conversation } from "./types.d.ts";
import { uuid4 } from "./fns2.ts";
import { sharedVars } from "./sharedVars.ts";
const configs = getConfigs();
// ===============================================================
export async function runModels(
  args: {
    botName: string;
    userName: string;
    userInput: string;
    chat_history_ids: number[];
    counter: number;
    tmpMems: Conversation[];
    prevKeywords: string[];
    // workers: Worker[],
    convId: string;
    // staticPrivateOrPublic?: boolean;
  },
) {
  // -------------------------------------------------------
  const qaId = uuid4();
  // -------------------------------------------------------
  sharedVars.tmpVector.set(await getVector(args.userInput));
  args.tmpMems.push(createMem({
    convId: args.convId,
    qaId,
    speaker: args.userName,
    text: args.userInput,
    vector: sharedVars.tmpVector,
  }));
  // -------------------------------------------------------
  // summary
  const summary = args.tmpMems.length < 10
    ? ""
    : await getSummary({ userName: args.userName, tmpMems: args.tmpMems });
  // -------------------------------------------------------
  // summary
  let keywords = "";
  if (args.tmpMems.length > 0) {
    const res = await getKeyWords({
      userName: args.userName,
      tmpMems: args.tmpMems,
      prevKeywords: args.prevKeywords,
    });
    args.prevKeywords = res.prevKeywords;
    keywords = res.keywords;
  }
  // -------------------------------------------------------
  // vocab
  /* issue:kajshdiajhsd */
  /* const newVoc = createVocab(await getVocabData()); */
  const EOS = " EOS ";
  const newVoc = "";
  // -------------------------------------------------------
  /* const updatedPublicMems = (await giveAJobToWorkers({
    conversations: publicMems,
    originalText: args.userInput,
    privateMem: false,
    userInputVector: sharedVars.tmpVector,

    firstSpeaker: args.userName,
  }, args.workers) as Conversation[]) */
  const publicMems = await getLongTermMems({
    privateMem: false,
    firstSpeaker: args.userName,
    limit: configs.maxPublicLongTermMemThatCanBeFetched, 
  });

  const updatedPublicMems = (await addScoreToMemories({
    conversations: publicMems,
    originalText: args.userInput,
    privateMem: false,
    userInputVector: sharedVars.tmpVector,
  })).toSorted((a, b) => b.score - a.score)
    .slice(0, configs.randomMemoryFetchingLength);
  const similar_public_memories_withPairs = loadPairs({
    conversations: publicMems,
    updatedConvs: updatedPublicMems,
    limit: configs.randomMemoryFetchingLength,
    botName: args.botName,
    userName: args.userName,
  });
  // -------------------------------------------------------
  let finalPublicMems = "";
  if (similar_public_memories_withPairs.length > 2) {
    for (let index = 1; index < 2; index += 2) {
      finalPublicMems += `\t\t- ${
        similar_public_memories_withPairs[index - 1]["message"]
      }${EOS}${similar_public_memories_withPairs[index]["message"]} \n`;
    }
  }
  // -------------------------------------------------------
  const privateMems = await getLongTermMems({
    privateMem: true,
    firstSpeaker: args.userName,
    limit: configs.maxPrivateLongTermMemThatCanBeFetched,
    // startFrom:Math.ceil((Math.random()*10000)-100)/* todo:replace this with wholeMessages.length */
    // startFrom: 0, /* todo:replace this with wholeMessages.length */
  });
  const updatedPrivateMems = (await addScoreToMemories({
    conversations: privateMems,
    originalText: args.userInput,
    privateMem: true,
    userInputVector: sharedVars.tmpVector,
  }))
    /* const updatedPrivateMems = (await giveAJobToWorkers({
    conversations: privateMems,
    originalText: args.userInput,
    privateMem: true,
    userInputVector: sharedVars.tmpVector,
  }, args.workers) as Conversation[]) */
    .toSorted((a, b) => b.score - a.score)
    .slice(0, configs.memoryFetchingLength);
  const similar_memories_withPairs = loadPairs({
    conversations: privateMems,
    updatedConvs: updatedPrivateMems,
    limit: configs.memoryFetchingLength,
    botName: args.botName,
    userName: args.userName,
  });

  let finalPrivateMems = "";
  if (similar_memories_withPairs.length > 4) {
    for (let index = 1; index < 4; index += 2) {
      finalPrivateMems += `\t\t- ${
        similar_memories_withPairs[index - 1]["message"]
      }${EOS}${similar_memories_withPairs[index]["message"]}\n`;
    }
  }
  // -------------------------------------------------------
  /* question/contex model */
  /* const qa1 = await getQa1({
    newVoc,
    summary,
    similar_memo2ries_withPairs: similar_public_memories_withPairs,
    ...args,
  }); */
  // -------------------------------------------------------
  const godel2: string = await pythonProxy({
    functionName: "predict_godel_base",
    param: `${args.userInput}`,
  });
  // -------------------------------------------------------
  const recentMessages_withEos2 = (await getShortTermMems({
    limit: 3,
    firtSpeaker: args.userName,
    tmpMems: args.tmpMems,
  })).map((i) => i.message).join(EOS);
  const godel3: string = await pythonProxy({
    functionName: "predict_godel_base",
    param: `${recentMessages_withEos2}`,
  });
  // console.log({recentMessages_withEos2})
  // -------------------------------------------------------
  const recentMessages_withEos3 = (await getShortTermMems({
    limit: 15,
    firtSpeaker: args.userName,
    tmpMems: args.tmpMems,
  })).map((i) => i.message).join(EOS);
  const godel4: string = await pythonProxy({
    functionName: "predict_godel_base",
    param: `${recentMessages_withEos3}`,
  });
  // console.log({recentMessages_withEos2})
  // -------------------------------------------------------
  /* main godel */
  const recentMessages_withEos = (await getShortTermMems({
    limit: configs["lastMessagesLength"],
    firtSpeaker: args.userName,
    tmpMems: args.tmpMems,
  })).map((i) => i.message)
    .join(EOS);

  const instructions =
    `Instruction: given a dialog context, you need to response safely based on the knowledge.`;
  const finalSummerizedInput = `
${instructions}
[CONTEXT]
${recentMessages_withEos}
` +
    `[KNOWLEDGE]
\t[facts]
\t\t- your name is ${args.botName}.
\t\t- you are a chatbot AI model with long-term memory. 
\t\t- your purpose is to help people by providing related responses .

\t[summary]:
\t\t-${summary}

\t[keywords]:
\t\t-${keywords}

\t[similar memories]:
${finalPrivateMems}

\t[random answer examples]:
\t\t- ${godel2}
\t\t- ${godel3}
\t\t- ${godel4}
${finalPublicMems}
` +
    ``;
  console.log("=================================================");
  console.log("main_finalSummerizedInput", finalSummerizedInput);
  console.log("=================================================");
  const finalResult: string = await pythonProxy({
    functionName: "predict_godel_base",
    param: finalSummerizedInput,
  });

  // -------------------------------------------------------
  const res = await saveMem({
    convId: args.convId,
    qaId,
    speaker: args.userName,
    text: args.userInput,
    vector: sharedVars.tmpVector,
    privateMem: true,
  });

  sharedVars.tmpVector.set(await getVector(finalResult));
  const res2 = await saveMem({
    convId: args.convId,
    qaId,
    speaker: args.botName,
    text: finalResult,
    vector: sharedVars.tmpVector,
    privateMem: true,
  });

  args.tmpMems.push(res2);
  // -------------------------------------------------------
  /* todo:enable this */
  /* saveLogs(finalResult, finalSummerizedInput); */
  // -------------------------------------------------------
  return {
    output: finalResult,
    chat_history_ids: args.chat_history_ids,
    tmpMems: args.tmpMems,
    prevKeywords: args.prevKeywords,
    counter: args.counter,
  };
}
// ===============================================================
