import { SSTConfig } from "sst";
import { Bucket } from "./stacks/Bucket";
import { Api } from "./stacks/Api";
import { Next } from "./stacks/Next";


export default {
  config(_input) {
    return {
      name: process.env.APP_NAME || "sst-maps",
      region: process.env.AWS_REGION || "us-east-1",
    };
  },
  stacks(app) {
    app
      .stack(Bucket)
      .stack(Api)
      .stack(Next);
  }
} satisfies SSTConfig;