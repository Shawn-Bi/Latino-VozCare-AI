import { secrets } from 'base44:runtime';
import { AuthError } from "./access.ts";

const EL = "https://api.elevenlabs.io/v1/convai";

export function elHeaders() {
  return { "xi-api-key": secrets.get("ELEVENLABS_API_KEY"), "Content-Type": "application/json" };
}

export async function conversationStatus(id: string): Promise<string | null> {
  const r = await fetch(`${EL}/conversations/${id}`, { headers: elHeaders(), signal: AbortSignal.timeout(10000) });
  return r.ok ? (await r.json()).status : null;
}

// Validates a US number and returns it in +1 format.
export function usNumber(raw: unknown): string {
  const digits = String(raw || "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) throw new AuthError(400, "Enter a valid US phone number.");
  return `+1${national}`;
}

export async function findAgentPhoneId(): Promise<string> {
  const fromNumber = secrets.get("TWILIO_FROM_NUMBER");
  const pr = await fetch(`${EL}/phone-numbers`, { headers: elHeaders(), signal: AbortSignal.timeout(10000) });
  if (!pr.ok) throw new AuthError(502, "The call service is not reachable.");
  const numbers = await pr.json();
  const match = (Array.isArray(numbers) ? numbers : numbers.phone_numbers || []).find((n: any) => n.phone_number === fromNumber);
  if (!match) throw new AuthError(502, "The calling number is not set up in the call service.");
  return match.phone_number_id;
}

// Places the outbound call. Returns the conversation id, or null if it failed to start.
export async function dial(agentPhoneId: string, toNumber: string, vars: Record<string, string>): Promise<string | null> {
  const callRes = await fetch(`${EL}/twilio/outbound-call`, {
    method: "POST",
    headers: elHeaders(),
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      agent_id: secrets.get("ELEVENLABS_AGENT_ID"),
      agent_phone_number_id: agentPhoneId,
      to_number: toNumber,
      conversation_initiation_client_data: { dynamic_variables: vars },
    }),
  });
  const result = await callRes.json().catch(() => ({}));
  if (!callRes.ok || result.success === false) {
    console.error("outbound-call failed", callRes.status, JSON.stringify(result));
    return null;
  }
  return result.conversation_id || "";
}