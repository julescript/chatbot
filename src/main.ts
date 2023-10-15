// import { createRequire } from "module";
// const require = createRequire(import.meta.url);

import { Client } from "whatsapp-web.js";
const qrcode = require("qrcode-terminal");
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

require("dotenv").config();

const configuration = new OpenAI({
  apiKey: process.env.OPENAI_KEY ?? "",
});

const prisma = new PrismaClient();

const prevMessages: {
  [userId: string]: {
    control: () => void;
    messages: { role: "user"; content: string }[];
  };
} = {};

const openai = new OpenAI(configuration as any);

const client = new Client({});

function debounce(func: (...args: any) => void, timeout = 10000) {
  let timer: any;
  return (...args: any) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.initialize();

async function runCompletion(messages: any) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 2000,
    });
    console.log(completion.choices);

    return completion.choices[0].message.content;
  } catch (err) {
    console.log(err);
  }
}

client.on("message", async (message) => {
  const sender = message.from;

  if (!message.body) return;

  const messageContent = message.body.substring(1);

  if (message.body.startsWith("/")) {
    if (!prevMessages[sender]) {
      const userMessages = await prisma.user.findFirst({
        where: { id: sender },
        include: { messages: { take: 9 } },
      });

      if (!userMessages) {
        client.sendMessage(
          sender,
          "hello there! This is Maxiphy AI chatbot, how can I help you today"
        );

        await prisma.user.create({
          data: {
            id: sender,
            messages: { create: { content: messageContent } },
          },
        });

        const controlFn = debounce(() => {
          delete prevMessages[sender];
        });

        controlFn();

        prevMessages[sender] = {
          control: controlFn,
          messages: [
            ...(prevMessages?.[sender]?.messages || []),
            {
              role: "user",
              content: messageContent,
            },
          ],
        };

        console.log(prevMessages[sender]);
      } else {
        const controlFn = debounce(() => {
          delete prevMessages[sender];
        });

        controlFn();

        prevMessages[sender] = {
          control: controlFn,
          messages: [
            ...(prevMessages?.[sender]?.messages || []),
            ...userMessages?.messages?.map((e) => ({
              role: "user" as const,
              content: e.content || "",
            })),
          ],
        };

        await prisma.user.update({
          where: { id: sender },
          data: { messages: { create: { content: messageContent } } },
        });

        console.log(prevMessages[sender]);
      }

      return;
    }

    // if (prevMessages[sender].length > 10)
    //   prevMessages[sender] = prevMessages[sender].slice(1);

    prevMessages?.[sender]?.control();
    console.log({ alreadyInit: prevMessages?.[sender] });

    // runCompletion(prevMessages[sender]).then((result) => message.reply(result));
  }
});
