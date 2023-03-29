import getConfigs from "./getConfigs.ts";
import { getVector } from "./fns.ts";
import {
  /*  saveInput, saveOutput, */
  saveMem,
  uuid4,
} from "./fns2.ts";
const configs = getConfigs();
let conter = 0;
// =========================================
// =========================================
/* console.error("!!!Resetting Datasets!!!");
const asd = confirm("you are about to Reset the database , are you sure?");
if (!asd) Deno.exit();
await Deno.remove(configs.memoriesPath, { recursive: true }).catch((e) =>
  console.log("not found")
);
await Deno.remove(configs.vectorsPath, { recursive: true }).catch((e) =>
  console.log("not found")
); */
// =========================================
console.log("making dirs");
await Deno.mkdir(configs.memoriesPath + "").catch((e) =>
  console.info("already exist")
);
await Deno.mkdir(configs.memoriesPath + "/public").catch((e) =>
  console.info("already exist")
);
await Deno.mkdir(configs.vectorsPath + "").catch((e) =>
  console.info("already exist")
);
await Deno.mkdir(configs.vectorsPath + "/public").catch((e) =>
  console.info("already exist")
);
await Deno.mkdir(configs.memoriesPath + "/private").catch((e) =>
  console.info("already exist")
);
await Deno.mkdir(configs.vectorsPath + "/private").catch((e) =>
  console.info("already exist")
);
// await Deno.mkdir(configs.private_memoriesPath).catch((e) =>
//   console.info("already exist")
// );
await Deno.mkdir(configs.conversationLogsPath).catch((e) =>
  console.info("already exist")
);
// await Deno.mkdir(configs.private_vectorsPath).catch((e) =>
//   console.info("already exist")
// );
await Deno.mkdir(configs.selfTalksPath).catch((e) =>
  console.info("already exist")
); 
// =========================================
console.error("!!!Adding new Datasets!!!");
// =========================================
// /* issue:this file has different splitter , prevs vere like text_1 but this one is like "test_0_1", //test_490_1 */
// conter = await converXmlToDataset({
//   csvFileName: "dialog/test.csv",
//   sectionSpliter: "test_", //test_490_1
//   includeSummary:true,
// });
// console.log(conter, "items added"); 
// // // =========================================
// conter = await converXmlToDataset({
//   csvFileName: "dialog/train.csv",
//   sectionSpliter: "train_",
//   includeSummary:true,
// });
// console.log(conter, "items added");
// // // // =========================================
// conter = await converXmlToDataset({
//   csvFileName: "dialog/validation.csv",
//   sectionSpliter: "dev_",
//   includeSummary:true,
// });
// console.log(conter, "items added");
// // =========================================
conter = await converXmlToDataset({
  csvFileName: "dialog/holdout.csv",
  sectionSpliter: "hiddentest_",
  includeSummary:false,
});
console.log(conter, "items added");
// // =========================================
conter = await addInputOutputLikeJson({ jsonFileName: "prePrompts.json" });
console.log(conter, "items added");
// // =========================================
// conter = await addInputOutputLikeJson({ jsonFileName: "prePrompts2.json" });
// console.log(conter, "items added");
// =========================================
async function addInputOutputLikeJson(args: { jsonFileName: string }) {
  let counter = 0;
  const preprompts: { input: string; output: string }[] = JSON.parse(
    await Deno.readTextFile(`${configs.rawDatasets}/${args.jsonFileName}`),
  );
  // for item in len(preprompts):range(len(preprompts))
  const convId = uuid4();
  for (let index = 0; index < preprompts.length; index++) {
    const item = preprompts[index];
    await fakeRunModelForFeeding({
      userInput: item.input,
      output: item.output,
      userName: configs.userName,
      botName: configs.botName,
      convId: convId,
      privateMem: true,
    });
    counter += 1;
  }
  return counter;
}
// =========================================
/* Note:if the person1 be the last one the last sentence will be ignored */
async function converXmlToDataset(args: {
  csvFileName: string;
  sectionSpliter: string;
  includeSummary: boolean;
}) {
  let counter = 0;
  const txt = await Deno.readTextFile(
    `${configs.rawDatasets}/${args.csvFileName}`,
  );
  const convs = txt.split("\n").slice(1).join("\n").split(args.sectionSpliter);
  for (let index = 0; index < convs.length; index++) {
    let currentConv_ = convs[index].split(",");
    const summary = args.includeSummary?currentConv_[currentConv_.length - 2]:'';
    /* todo:use this later for search mems based on topics and score */
    const topic = currentConv_[currentConv_.length - 1];
    const currentConv__ = currentConv_.slice(1, currentConv_.length - (args.includeSummary?2:1)).join(
      ",",
    );
    const currentConv = currentConv__
      .slice(1, currentConv__.length - 1) 
      .split("\n"); 

    if(currentConv[0]=="")continue //empty line
    const convId = uuid4();
    let input = "";
    let output = "";
    for (let index2 = 0; index2 < currentConv.length; index2++) {
      const row = currentConv[index2].split("#:");
        /* this means that the last one is the person1 so we need to fill the person2 with  */
      /* if (currentConv.length%2!=0 && index2==currentConv.length) {
        currentConv[index2-1].split("#:")[1]
      }else  */
      if (row[0].includes("Person1")) {
        input = row[1];
      } else if (row[0].includes("Person2")) {
        output = row[1];
      } else {
        continue; //emptyLine
      }

      if (input != "" && output != "") {
        counter += 1;
        await fakeRunModelForFeeding({
          userInput: input,
          output: output,
          userName: configs.userName,
          botName: configs.botName,
          convId: convId,
          privateMem: false,
        });
        input = "";
        output = "";
      }
    }
  }
  return counter;
}
// ========================================================
export async function fakeRunModelForFeeding(
  args: {
    userInput: string;
    output: string;
    botName: string;
    userName: string;
    convId: string;
    privateMem: boolean;
  },
) {
  // --------------------
  const qaId = uuid4() 
  await saveMem({
    convId: args.convId,
    qaId,
    speaker: args.userName,
    text: args.userInput,
    vector: await getVector(args.userInput),
    privateMem: args.privateMem,
  });
  await saveMem({
    convId: args.convId,
    qaId,
    speaker: args.botName,
    text: args.output,
    vector: await getVector(args.output),
    privateMem: args.privateMem,
  });
}
