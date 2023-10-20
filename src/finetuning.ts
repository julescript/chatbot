import OpenAI from "openai";
import fs from "fs";

require("dotenv").config();

const configuration = new OpenAI({
  apiKey: process.env.OPENAI_KEY ?? "",
});

const openai = new OpenAI(configuration as any);

async function uploadFile() {
  try {
    const f = await openai.files.create({
      file: fs.createReadStream("./fineTuneData.jsonl"),
      purpose: "fine-tune",
    });

    console.log(f);
    console.log(`File ID ${f.id}`);
    return f.id;
  } catch (err) {
    console.log("err uploadfile: ", err);
  }
}
// uploadFile();
async function makeFineTune() {
  try {
    const fineTune = await openai.fineTuning.jobs.create({
      training_file: "file-3TIQqUCteh5ogiLxJ4vsJrjh",
      model: "ft:gpt-3.5-turbo-0613:personal::8BkR7wJl",
    });
    console.log(fineTune);
  } catch (err) {
    console.log("err makefinetune: ", err);
  }
}
// makeFineTune();

async function getFineTunedModelName() {
  try {
    let page = await openai.fineTuning.jobs.list({ limit: 10 });
    // let fineTune = await openai.fineTuning.jobs.retrieve(
    //   "ftjob-71MtnHLw4agh2FHc7VAtIqmO"
    // );
    console.log({ data: page.data });
    // console.log({ fineTune });
  } catch (err) {
    console.log("err getmod: ", err);
  }
}
getFineTunedModelName();
