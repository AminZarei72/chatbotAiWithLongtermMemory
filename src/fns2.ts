
import getConfigs from "./getConfigs.ts";
// import { getVector, saveFile } from "./fns.ts";
import { Conversation } from "./types.d.ts";
const configs = getConfigs();

let uuidCounter = Math.random() * 1000;
// export const uuid4 = () => Math.random() * 1000;
export const uuid4 = () => (uuidCounter += 1).toString(); /* todo:change this to the main fn */
export const time = () => new Date().valueOf();
export function timeString(unix_time: number) {
  const asd=new Date(unix_time)
  return `${asd.getFullYear()}/${asd.getMonth()}/${asd.getDay()} ${asd.getHours()}:${asd.getMinutes()}:${asd.getSeconds()} `
}
// ========================================================
export async function loadVector({ uuid, privateMem }: { uuid: string; privateMem: boolean; }) {
  const privateDir=privateMem?'private':'public'
  const res = await Deno.readTextFile(`${configs.vectorsPath}/${privateDir}/${uuid}`);
  const res_ = JSON.parse(`[${res}]`) as number[];
  return res_;
}
// ========================================================
export async function saveMem(args: {
  // vector: number[]|Float32Array|Float64Array|Uint8Array,
  vector: any,
  text: string,
  qaId: string,
  convId: string,
  speaker: string,
  privateMem?: boolean,
}) {
  const uuid = uuid4();
  const unixtime = time();
  const inputMem: Conversation = {
    speaker: args.speaker,
    time: unixtime,
    message: args.text,
    uuid: uuid,
    timestring: timeString(unixtime),
    qaId: args.qaId,
    convId: args.convId,
    score: 0,
  };
  /* todo:change this to fb */
  // sharedVars.conversations.push(inputMem);
  /* todo:change this to fbFiles */
  const privateDir=args.privateMem?'private':'public'
  await Deno.writeTextFile(
    `${configs.memoriesPath}/${privateDir}/${uuid}`,
    JSON.stringify(inputMem),
  );
  // const
  // console.log(args.vector.toString())
  await Deno.writeTextFile(
    `${configs.vectorsPath}/${privateDir}/${uuid}`,
    args.vector.toString(),
  );
  return inputMem;
} 
// ========================================================
export function createMem(args: {
  // vector: number[]|Float32Array|Float64Array|Uint8Array,
  vector: Float64Array,
  text: string,
  qaId: string,
  convId: string,
  speaker: string, 
}) {
  const uuid = uuid4();
  const unixtime = time();
  const inputMem: Conversation = {
    speaker: args.speaker,
    time: unixtime,
    message: args.text,
    uuid: uuid,
    timestring: timeString(unixtime),
    qaId: args.qaId,
    convId: args.convId,
    score: 0,
  }
  return inputMem;
} 
// ========================================================
export function jaccardSimilarity(a: number[], b: number[]): number {
  const aSet = new Set(a);
  const bSet = new Set(b);
  const shorter = aSet.size < bSet.size ? aSet : bSet;
  const longer = aSet.size > bSet.size ? aSet : bSet;
  let intersection = 0;
  shorter.forEach((el) => {
    if (longer.has(el)) {
      intersection++;
    }
  });
  const union = (aSet.size + bSet.size) - intersection;
  return intersection / union;
} 
// ========================================================
export function getRandom(max:number): number[] {
  const final:number[]=[] 
    console.log(max)
    while (true) {
    const rnd=Math.ceil(Math.random()*max)
    if(!final.includes(rnd))final.push(rnd)
      if(final.length>=max)break
  }
 /* return Array.from({length:max},i=>Math.ceil(Math.random()*max)) */
 return final
}
// ========================================================
export function similarity2(v1: number[], v2: number[]): number {
  return v1.reduce((acc, cur, i) => acc + cur * v2[i], 0) /
    (Math.sqrt(v1.reduce((acc, cur) => acc + cur * cur, 0)) *
      Math.sqrt(v2.reduce((acc, cur) => acc + cur * cur, 0)));
}
// ===============================================================================
export async function pythonProxy(
  body_: { functionName: string; param: string | any[]; text2?: string },
) {
  const res = await (await fetch("http://172.17.0.2:5001/", {
    body: JSON.stringify(body_), 
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
  })).json();
  return res["result"];
}
// ===============================================================================
 