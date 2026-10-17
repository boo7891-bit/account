import { createClient } from "@supabase/supabase-js";

const MODEL = "gemini-3.5-flash-lite";

const PROMPT = `영수증 이미지에서 다음을 읽어 JSON으로 답하세요.
- amount: 최종 결제 합계(원, 정수). 부가세·공급가액·받은 돈·거스름돈이 아니라 실제로 결제한 총액입니다.
- date: 결제 날짜 (YYYY-MM-DD)
- place: 사용처(상호명)
읽을 수 없거나 확실하지 않은 항목은 추측하지 말고 null로 두세요.`;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "GEMINI_API_KEY가 설정되지 않았어요 (.env.local 확인)" }, { status: 500 });

  // 로그인한 사용자만 호출 가능 (API 키 남용 방지)
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data: auth } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  if (!auth.user) return Response.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { image, mimeType } = await request.json();
  if (typeof image !== "string" || typeof mimeType !== "string") {
    return Response.json({ error: "이미지가 없어요" }, { status: 400 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType, data: image } }, { text: PROMPT }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              amount: { type: "INTEGER", nullable: true },
              date: { type: "STRING", nullable: true },
              place: { type: "STRING", nullable: true },
            },
            required: ["amount", "date", "place"],
          },
        },
      }),
    },
  );
  if (!res.ok) return Response.json({ error: `Gemini 호출 실패 (${res.status})` }, { status: 502 });

  try {
    const json = await res.json();
    const parsed = JSON.parse(json.candidates[0].content.parts[0].text);
    const amount = Number.isInteger(parsed.amount) && parsed.amount > 0 ? parsed.amount : null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date ?? "") ? parsed.date : null;
    const place = typeof parsed.place === "string" && parsed.place.trim() ? parsed.place.trim() : null;
    return Response.json({ amount, date, place });
  } catch {
    return Response.json({ error: "영수증을 읽지 못했어요" }, { status: 502 });
  }
}
