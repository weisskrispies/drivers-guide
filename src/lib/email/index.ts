// Email delivery. Uses Resend (https://resend.com) when RESEND_API_KEY is set,
// otherwise logs to the console so local dev / unconfigured deploys don't fail.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendResult {
  ok: boolean;
  provider: "resend" | "console";
  id?: string;
  error?: string;
}

function fromAddress(): string {
  return process.env.ALERT_FROM_EMAIL || "Concert Radar <onboarding@resend.dev>";
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[email:console] To: ${msg.to} | Subject: ${msg.subject}\n${
        msg.text ?? stripHtml(msg.html)
      }`,
    );
    return { ok: true, provider: "console" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text ?? stripHtml(msg.html),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        provider: "resend",
        error: `Resend error ${res.status}: ${body}`.slice(0, 300),
      };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, provider: "resend", id: data.id };
  } catch (err) {
    return {
      ok: false,
      provider: "resend",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
