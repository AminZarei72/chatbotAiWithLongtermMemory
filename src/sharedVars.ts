import getConfigs from "./getConfigs.ts";
const configs = getConfigs();
export class sharedVars {
  static tmpVector = new Float64Array(configs.vectorSize).fill(1); //-0.12403248995542526,
}
