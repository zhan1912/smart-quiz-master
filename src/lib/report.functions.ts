import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().max(80).optional().default(""),
  contact: z.string().trim().max(120).optional().default(""),
  message: z.string().trim().min(5, "Слишком короткое сообщение").max(1000),
});

export const sendReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const token = process.env["TELEGRAM_BOT_TOKEN"];
    const chatId = process.env["TELEGRAM_CHAT_ID"];
    if (!token || !chatId) throw new Error("Telegram не настроен");

    const text = [
      "🐞 <b>ZhanQuiz — сообщение о проблеме</b>",
      `👤 Имя: ${data.name || "не указано"}`,
      `📮 Контакт: ${data.contact || "не указан"}`,
      "",
      data.message,
    ].join("\n");

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`Telegram sendMessage failed [${res.status}]: ${body}`);
      throw new Error(`Не удалось отправить сообщение [${res.status}]`);
    }
    const json = JSON.parse(body) as { ok: boolean; description?: string };
    if (!json.ok) {
      console.error(`Telegram error: ${json.description}`);
      throw new Error(json.description || "Ошибка Telegram");
    }
    return { ok: true };
  });
