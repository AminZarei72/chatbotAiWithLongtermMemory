import getConfigs from "./getConfigs.ts";
import {
  getRandom,
  // cosineSimilarity,
  // jaccardSimilarity,
  loadVector,
  pythonProxy,
  similarity2,
} from "./fns2.ts";
import { Conversation/* , Vocabularies  */} from "./types.d.ts";
// import { sharedVars } from "./sharedVars.ts";
// import { consineSimilarity } from "./fns3.ts";
const configs = getConfigs();
// ===============================================================================
export async function getSummary(
  args: { userName: string; tmpMems: Conversation[] },
) {
  const dataForSummary = (await getShortTermMems({
    limit: 20,
    firtSpeaker: args.userName,
    tmpMems: args.tmpMems,
  }))
  .map((i) => `-${i.speaker}: ${i.message}`).join(" EOS ");
  const summary: string = await pythonProxy({
    functionName: "predict_godel_base",
    param:
      `summarize this dialog between ${configs.userName} and ${configs.botName} in one sentence: ${dataForSummary}`,
  });
  return summary;
}
// ===============================================================================
export async function getKeyWords(
  args: {
    userName: string;
    tmpMems: Conversation[];
    prevKeywords: string[];
  },
) {
  /*
    special_tokens={
      'unk_token': '[UNK]',
     'sep_token': '[SEP]',
     'pad_token': '[PAD]',
     'cls_token': '[CLS]',
     'mask_token': '[MASK]'
    })
    */
  const mask_model_Sep = " [SEP] ";
  const mask_model_cls = " [CLS] ";

  const dataForSummary = (await getShortTermMems({
    limit: 20,
    firtSpeaker: args.userName,
    tmpMems: args.tmpMems,
  }))
    .map((i) => `-${i.speaker}: ${i.message}`)
    .join(`${mask_model_Sep}`);
  
  /* can also be done for (title,key word ,subject,topic,main problem,moral lession) */
  let res: {
    "score": number;
    "token": 2028;
    "token_str": string;
    "sequence": string;
  }[] = await pythonProxy({
    functionName: "predict_mask",
    param: [
      `the following dialog between ${configs.userName} and ${configs.botName} is about `,
      `. ${mask_model_cls}
      dialog:${dataForSummary}
      `,
    ],
  });
  args.prevKeywords = args.prevKeywords.concat(res.map((i) => i.token_str));
  res = await pythonProxy({
    functionName: "predict_mask",
    param: [
      `the topic of the following dialog between ${configs.userName} and ${configs.botName} is  `,
      `.${mask_model_cls}
      dialog:${dataForSummary}
      `,
    ],
  });
  args.prevKeywords = args.prevKeywords.concat(res.map((i) => i.token_str));
  res = await pythonProxy({
    functionName: "predict_mask",
    param: [
      `the topic of the following conversation is `,
      `.${mask_model_cls}
      conversation:${dataForSummary}
      `,
    ],
  });
  args.prevKeywords = args.prevKeywords.concat(res.map((i) => i.token_str));

  const notAllowed = [
    "this",
    "it",
    "here",
    "me",
    "you",
    "him",
    "her",
    "this",
    "here",
    "unknown",
    "personal",
    "everything",
    "ambiguous",
    "similar",
    "simple",
    ":",
    "ie",
    "c",
    "important",
    "interesting",
    ".",
  ];

  const keywords = Array.from(new Set(args.prevKeywords))
    .filter((i) => !notAllowed.includes(i))
    .join(",");

  return { keywords, prevKeywords: args.prevKeywords };
}
// ========================================================
export async function getVector(text: string) {
  const vector = await pythonProxy({
    functionName: "findSimilarityBasedOnEmbeddings_all",
    param: text,
  });
  return vector[0];
}
// ========================================================
export async function addScoreToMemories(
  { conversations, originalText, privateMem, userInputVector }: {
    conversations: Conversation[];
    originalText: string;
    privateMem: boolean;
    userInputVector: Float64Array;
  },
) { 
  console.log("conversations.length", conversations.length);
  const lastItemVector = Array.from(userInputVector);

  const memories = [];
  for (const key in conversations) {
    const item = conversations[key];
    if (originalText == item["message"]) {
    /* skip this one because it is the same message */
      continue;
    }

    const currentItemVector = await loadVector({
      uuid: item.uuid,
      privateMem: privateMem,
    });

    const score = similarity2(
      lastItemVector,
      currentItemVector,
    ); 

    // score = jaccard_similarity(item['vector'], vector)  
    /* gpu */
    /* const score = cosineSimilarity(
      [lastItemVector],
      [currentItemVector],
    ); 
    if(isNaN(score))score=0
    */
    item["score"] = score;
    memories.push(item);
    // -------------------------------
    // search for its pair
    // todo:what if the bot has an question that we answered it on the next q/a or ,what if it was already answering the question we asked it.
    //   -for example:user:hello how are you? , bot:im good how are you? user:im great. what do you think about ai? bot:hope to see you feeling perfect. i think ai is...

    //    memories.insert()
    // -------------------------------
  }
  return memories;
}
// ===============================================================================
export function loadPairs(
  { updatedConvs, limit, conversations, userName, botName }: {
    updatedConvs: Conversation[];
    conversations: Conversation[];
    limit: number;
    userName: string;
    botName: string;
  },
) {
  const memories: Conversation[] = [];
  const repetativeItems: string[] = [];
  let counter = 0;
  for (let index = 0; index < updatedConvs.length; index++) {
    const item = updatedConvs[index];
    if (counter >= limit * 2) break;
    if (repetativeItems.includes(item.qaId)) continue;
    for (let index2 = 0; index2 < conversations.length; index2++) {
      const item2 = conversations[index2];
      if (item.qaId == item2.qaId) {
        if (
          item.speaker == `${userName}` &&
          item2.speaker == `${botName}`
        ) {
          memories.push(item);
          memories.push(item2);
          repetativeItems.push(item.qaId);

          counter += 1;
          break;
        }

        if (
          item.speaker == `${botName}` &&
          item2.speaker == `${userName}`
        ) {
          memories.push(item2);
          memories.push(item);
          repetativeItems.push(item.qaId);
          counter += 1;
          break;
        }
      }
    }
  }

  return memories;
}
// ===============================================================================
  export async function getLongTermMems(
    { privateMem, limit, firstSpeaker, startFrom = 0 }: {
      privateMem: boolean;
      limit: number;
      firstSpeaker: string;
      startFrom?: number;
    },
  ) {
    const items = getRandom(limit);
    const conversations: Conversation[] = [];
    const privateDir = privateMem ? "private" : "public";
    let index = 0; 
    for (
      const dirEntry of Deno.readDirSync(`${configs.memoriesPath}/${privateDir}/`)
    ) {
      if (conversations.length>=limit) break;
      if (items.includes(index)) {
        if (dirEntry.name + ".json") {
          const file = await Deno.readTextFile(
            `${configs.memoriesPath}/${privateDir}/${dirEntry.name}`,
          );
          conversations.push(JSON.parse(file)); 
        }
      }
      index += 1;
    }
    /*
    let start = conversations.length - 1 - limit;
    let end = conversations.length;
    if (conversations.length == 0) return [];
    if (conversations.length < limit) start = 0;
  
    const cutedConversations = conversations.slice(start, end);
    return cutedConversations; */
  
    // const cutedConversations = conversations.reverse().slice(0, limit);
  
    /* cut last conversations but the firstSpeaker always must be the first */
    let start = conversations.length - 1 - limit;
    let end = conversations.length;
    if (conversations.length == 0) return [];
    if (conversations.length < limit) start = 0;
    if (start == -1) start = 0;
    if (conversations[start].speaker != firstSpeaker) {
      const cutedConversations = conversations.slice(start + 1, end + 1);
      return cutedConversations;
    } else {
      const cutedConversations = conversations.slice(start, end);
      return cutedConversations;
    }
  }
// ===============================================================================
// export async function getLastConvs(limit = 5683) {
export function getShortTermMems(
  { limit, firtSpeaker, tmpMems }: {
    limit: number;
    firtSpeaker: string;
    tmpMems: Conversation[];
  },
) {

  /* cut last conversations but the firstSpeaker always must be the first */
  let start = tmpMems.length - 1 - limit;
  let end = tmpMems.length;
  if (tmpMems.length == 0) return [];
  if (tmpMems.length < limit) start = 0;
  if (start == -1) start = 0;
  if (tmpMems[start].speaker != firtSpeaker) {
    const cutedConversations = tmpMems.slice(start + 1, end + 1);
    return cutedConversations;
  } else {
    const cutedConversations = tmpMems.slice(start, end);
    return cutedConversations;
  }
}

// ===============================================================================
export async function saveFile(path: string, text: string) {
  return await Deno.writeTextFile(Deno.cwd() + "/" + path, text);
}
// ===============================================================================
