export type Conversation = {
  message: string;
  speaker: string;
  score: number;
  convId: string;
  qaId: string;
  time: number;
  timestring: string;
  uuid: string;
  // vector: number[]|Float32Array|Float64Array;
};
export type Vocabularies = {
  "entity":
    | "O"
    | "B-MIS"
    | "I-MIS"
    | "B-PER"
    | "I-PER"
    | "B-ORG"
    | "I-ORG"
    | "B-LOC"
    | "I-LOC";
  "score": number;
  "index": number;
  "word": string;
  "start": number;
  "end": number;
};
