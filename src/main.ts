import getConfigs from "./getConfigs.ts";
import {  uuid4 } from "./fns2.ts";
import { runModels } from "./runModel.ts";
import { Conversation } from "./types.d.ts";
if (import.meta.main) {
  let userInput = "hi";
  let chat_history_ids: number[] = []; //torch.tensor(np.array([[]]))
  let counter = 0;
  const configs = getConfigs();
  const convId = uuid4();
  let tmpMems: Conversation[] = [];
  let prevKeywords: string[] = [];
  /*  const workers=[]
  for (let index = 0; index < configs.numWorkers; index++) {
    workers.push(new Worker(new URL('./worker.ts',import.meta.url).href,{type:'module'}))
  } */
  // ================================================================================
  while (true) {
    userInput = prompt("input:") as string;
    if (!userInput) userInput = "";

    const res = await runModels({
      userInput: userInput,
      chat_history_ids,
      tmpMems: tmpMems,
      counter,
      botName: configs.botName,
      userName: configs.userName,
      convId,
      prevKeywords,
      /* workers, */
    });
    tmpMems = res.tmpMems;
    prevKeywords = res.prevKeywords.slice();
    counter = res.counter;
    console.warn(res.output);
  }
}
// ================================================================================
