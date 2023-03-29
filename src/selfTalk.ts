import getConfigs from "./getConfigs.ts";
import { runModels } from "./runModel.ts";
import { uuid4 } from "./fns2.ts";
import { Conversation } from "./types.d.ts";

if (import.meta.main) {
  let chat_history_ids: number[] = []; //torch.tensor(np.array([[]]))
  let counter = 0;
  const configs = getConfigs();
  const convId = uuid4();
  // let ml1Outout = "lets talk about something ,i am so bored.";
  /** Note:this should stay blank since m2 cant see this(it would'nt know that it actually started the conversation) */
  let lastM2Output = " ";

  let tmpMems1: Conversation[] = [];
  let tmpMems2: Conversation[] = [];
  let prevKeywords1: string[] = [];
  let prevKeywords2: string[] = [];
  // ================================================================================
  while (true) {
    /* let userInput = prompt("input:");
    if (!userInput) userInput = ""; */
    // ================================================================================
    const m1_res = await runModels({
      userInput: lastM2Output,
      chat_history_ids,
      tmpMems: tmpMems1,
      counter,
      userName: configs.botName,
      botName: configs.userName,
      convId,
      prevKeywords: prevKeywords1,
    });
    tmpMems1 = m1_res.tmpMems.slice();
    prevKeywords1 = m1_res.prevKeywords.slice();
    /* kasdkajsnd */
    console.warn(m1_res.output);
    // ================================================================================
    const m2_res = await runModels({
      userInput: m1_res.output,
      chat_history_ids,
      tmpMems: tmpMems2,
      counter,
      botName: configs.botName,
      userName: configs.userName,
      convId,
      prevKeywords: prevKeywords2,
    });

    tmpMems2 = m2_res.tmpMems.slice();
    prevKeywords2 = m2_res.prevKeywords.slice();

    counter = m2_res.counter;
    console.warn(m2_res.output);
    lastM2Output = m2_res.output;
  }
}
