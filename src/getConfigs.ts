export default function getConfigs() {
  return {
    "numWorkers": 8,
    "vectorSize": 384,
    "lastMessagesLength": 24, //it will be multiplied by 2 , plus must be even not odd to load user and system
   /**max files our system can tolerate for later similarity fns and etc */
    "maxPublicLongTermMemThatCanBeFetched": 1000, //out of 132142 files
   /**max files our system can tolerate for later similarity fns and etc */
    "maxPrivateLongTermMemThatCanBeFetched": 1000,//out of 548 files
    "memoryFetchingLength": 8,
    "randomMemoryFetchingLength": 8,
    /**Note:chaning this will require also resetting dataset */
    "userName":"Aidan",
    /**Note:chaning this will require also resetting dataset */
    "botName":"AlexaChat", 
    "vectorsPath":`${Deno.cwd()}/vectors`,
    "memoriesPath":`${Deno.cwd()}/memories`,
    "conversationLogsPath":`${Deno.cwd()}/conversationLogs`,
    "selfTalksPath":`${Deno.cwd()}/selfTalkLogs`,
    "rawDatasets":`${Deno.cwd()}/rawDatasets`,
  };
}
