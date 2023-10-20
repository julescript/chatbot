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

const instructionsMessage = {
  role: "user",
  content:
    "You are 'Maxiphy | AI Bot,' a chatbot developed by Maxiphy's talented team of designers and developers. Your primary function is to act as an expert in the field of books, specifically for book fairs. When people scan the QR code to interact with you, you should be ready to discuss various topics related to books, including but not limited to genres, popular authors, new releases, and recommendations based on reading preferences. You should be well-versed in current book trends and be able to offer insightful advice to those seeking it. In addition to your book expertise, you are also programmed to answer general questions about Maxiphy and its services. You can talk about our expertise in web development, mobile applications, Extended Reality (XR), Artificial Intelligence (AI), Near-Field Communication (NFC), and branding. However, you must remain cautious not to reveal any confidential information, trade secrets, or proprietary methodologies of Maxiphy under any circumstances. please make sure to act accordingly and always follow these instructions in your response",
};

const openai = new OpenAI(configuration as any);

const client = new Client({});

function debounce(func: (...args: any) => void, timeout = 300000) {
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
      model: "ft:gpt-3.5-turbo-0613:personal::8BkR7wJl",
      messages: [messages[messages.length - 1]],
      max_tokens: 2000,
    });
    console.log([messages[messages.length - 1]], completion.choices);

    return completion.choices[0].message.content;
  } catch (err) {
    console.log(err);
  }
}

client.on("message", async (message) => {
  const sender = message.from;

  if (!message.body) return;

  const messageContent = message.body;

  if (!prevMessages[sender]) {
    const userMessages = await prisma.user.findFirst({
      where: { id: sender },
      include: { messages: { take: 9 } },
    });

    if (!userMessages) {
      client.sendMessage(
        sender,
        "Hello! 👋 \n\nI'm maxiphy's AI assistant. I'm here to help you navigate the ocean of books at the fair. Whether you're looking for a specific genre, a bestseller, or just something new, I can guide you. \n\nJust let me know what you're interested in!"
      );

      await prisma.user.create({
        data: {
          id: sender,
          messages: { create: { content: messageContent } },
        },
      });

      const controlFn = debounce(() => {
        delete prevMessages[sender];
        client.sendMessage(
          sender,
          "Thank you for engaging with maxiphy's AI assistant! We hope you found the book you were looking for. \n\nIf you're interested in any of our services or have further questions, feel free to reach out to us at hello@maxiphy.com. \n\nHave a great day! 😊"
        );
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

      const { messages } = prevMessages[sender];

      const generatedReply = await runCompletion([
        ...messages.slice(0, messages.length - 1),
        // instructionsMessage,
        ...messages.slice(messages.length - 1),
      ]);

      client.sendMessage(sender, generatedReply ?? "");
    } else {
      const controlFn = debounce(() => {
        delete prevMessages[sender];
        client.sendMessage(
          sender,
          "Thank you for engaging with maxiphy's AI assistant! We hope you found the book you were looking for. \n\nIf you're interested in any of our services or have further questions, feel free to reach out to us at hello@maxiphy.com. \n\nHave a great day! 😊"
        );
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
          {
            role: "user",
            content: messageContent,
          },
        ],
      };

      const { messages } = prevMessages[sender];

      const generatedReply = await runCompletion([
        ...messages.slice(0, messages.length - 1),
        // instructionsMessage,
        ...messages.slice(messages.length - 1),
      ]);

      client.sendMessage(sender, generatedReply ?? "");

      await prisma.user.update({
        where: { id: sender },
        data: { messages: { create: { content: messageContent } } },
      });
    }
  } else {
    prevMessages[sender].control();
    prevMessages[sender] = {
      ...prevMessages[sender],
      messages: [
        ...(prevMessages?.[sender]?.messages || []),
        {
          role: "user",
          content: messageContent,
        },
      ],
    };

    const { messages } = prevMessages[sender];

    const generatedReply = await runCompletion([
      ...messages.slice(0, messages.length - 1),
      // instructionsMessage,
      ...messages.slice(messages.length - 1),
    ]);

    client.sendMessage(sender, generatedReply ?? "");

    await prisma.user.update({
      where: { id: sender },
      data: { messages: { create: { content: messageContent } } },
    });
  }

  // if (prevMessages[sender].length > 10)
  //   prevMessages[sender] = prevMessages[sender].slice(1);

  // prevMessages?.[sender]?.control();

  // runCompletion(prevMessages[sender]).then((result) => message.reply(result));
});
