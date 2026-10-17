export const CATEGORIES = ["식비", "카페", "교통", "쇼핑", "구독", "기타"] as const;

export type Expense = {
  id: number;
  amount: number;
  place: string;
  category: (typeof CATEGORIES)[number];
  date: string; // YYYY-MM-DD
  memo: string;
};

export const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dateLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const day = "일월화수목금토"[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${day})`;
}
