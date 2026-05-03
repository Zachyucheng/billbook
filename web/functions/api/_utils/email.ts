import type { Env } from "./http";

export async function sendVerificationEmail(
  env: Env,
  email: string,
  code: string,
  expiresAt: string,
) {
  if (!env.RESEND_API_KEY?.trim() || !env.RESEND_FROM_EMAIL?.trim()) {
    throw new Error("服务器尚未配置 Resend 邮件参数。");
  }

  const expiresAtText = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date(expiresAt));

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [email],
      reply_to: env.RESEND_REPLY_TO_EMAIL,
      subject: "来财账本邮箱验证码",
      text: `你的来财账本验证码是 ${code}，有效期至 ${expiresAtText}。如果这不是你的操作，请忽略这封邮件。`,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    const diagnostic = responseText.trim().slice(0, 240);
    throw new Error(
      `验证码邮件发送失败，请稍后重试。请确认 RESEND_FROM_EMAIL 使用已验证域名邮箱。Resend 响应：${diagnostic || `HTTP ${response.status}`}`,
    );
  }
}
