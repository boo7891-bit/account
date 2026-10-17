"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CATEGORIES, Expense, dateLabel, todayStr, won } from "../lib/format";
import Stats from "./stats";

export default function Ledger() {
  const [view, setView] = useState<"list" | "stats">("list");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, amount, place, category, spent_on, memo")
      .order("created_at", { ascending: false });
    if (error) return setError(error.message);
    setExpenses(data.map(({ spent_on, ...rest }) => ({ ...rest, date: spent_on })) as Expense[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return setError(error.message);
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  }

  const [amount, setAmount] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState<Expense["category"]>(CATEGORIES[0]);
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");

  const thisMonth = todayStr().slice(0, 7);
  const monthTotal = expenses
    .filter((e) => e.date.startsWith(thisMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  const groups = Object.entries(
    expenses.reduce<Record<string, Expense[]>>((acc, e) => {
      (acc[e.date] ??= []).push(e);
      return acc;
    }, {}),
  ).sort(([a], [b]) => b.localeCompare(a));

  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");

  // 긴 변 1600px JPEG로 줄여서 업로드 크기 제한을 피함
  async function toJpegBase64(file: File) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  }

  async function scanReceipt(file: File) {
    setScanning(true);
    setScanNote("");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ image: await toJpegBase64(file), mimeType: "image/jpeg" }),
      });
      const r = await res.json();
      if (!res.ok) return setScanNote(`${r.error ?? "영수증을 읽지 못했어요"}. 직접 입력해주세요.`);
      setAmount(r.amount ? String(r.amount) : "");
      setPlace(r.place ?? "");
      setDate(r.date ?? "");
      const missing = [!r.amount && "금액", !r.place && "사용처", !r.date && "날짜"].filter(Boolean);
      setScanNote(
        missing.length
          ? `${missing.join(", ")}은(는) 읽지 못했어요. 직접 입력해주세요.`
          : "읽은 내용을 채웠어요. 확인 후 저장하세요.",
      );
    } catch {
      setScanNote("영수증을 읽지 못했어요. 직접 입력해주세요.");
    } finally {
      setScanning(false);
    }
  }

  function openForm() {
    setScanNote("");
    setAmount("");
    setPlace("");
    setCategory(CATEGORIES[0]);
    setDate(todayStr());
    setMemo("");
    setOpen(true);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const { error } = await supabase.from("expenses").insert({
      amount: Number(amount),
      place: place.trim(),
      category,
      spent_on: date,
      memo: memo.trim(),
    });
    if (error) return setError(error.message);
    setError("");
    setOpen(false);
    load();
  }

  return (
    <main>
      <div className="topbar">
        <p className="title">종현 가게부</p>
      </div>
      <div className="tabs">
        <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>내역</button>
        <button className={view === "stats" ? "on" : ""} onClick={() => setView("stats")}>통계</button>
      </div>

      {error && <p className="empty">오류: {error}</p>}

      {view === "stats" && <Stats expenses={expenses} />}

      {view === "list" && (
        <>
      <p className="month">{Number(thisMonth.slice(5))}월 지출</p>
      <h1 className="total">{won(monthTotal)}</h1>

      {!error && groups.length === 0 && <p className="empty">아직 지출 내역이 없어요</p>}

      {groups.map(([d, items]) => (
        <section className="group" key={d}>
          <div className="group-head">
            <span>{dateLabel(d)}</span>
            <span>{won(items.reduce((s, e) => s + e.amount, 0))}</span>
          </div>
          {items.map((e) => (
            <div className="item" key={e.id}>
              <div className="item-main">
                <div className="item-place">{e.place}</div>
                <div className="item-sub">{e.memo ? `${e.category} · ${e.memo}` : e.category}</div>
              </div>
              <div className="item-right">
                <span className="item-amount">{won(e.amount)}</span>
                <button
                  className="item-del"
                  aria-label="삭제"
                  onClick={() => remove(e.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </section>
      ))}
        </>
      )}

      <button className="fab" aria-label="지출 추가" onClick={openForm}>+</button>

      {open && (
        <div className="sheet-bg" onClick={() => setOpen(false)}>
          <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2>지출 입력</h2>
            <label className="btn receipt-btn">
              {scanning ? "영수증 읽는 중…" : "영수증 사진으로 채우기"}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={scanning}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) scanReceipt(f);
                }}
              />
            </label>
            {scanNote && <p className="scan-note">{scanNote}</p>}
            <label className="field">
              <span>금액</span>
              <input type="number" inputMode="numeric" min={1} required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </label>
            <label className="field">
              <span>사용처</span>
              <input required value={place} onChange={(e) => setPlace(e.target.value)} placeholder="예: 스타벅스" />
            </label>
            <label className="field">
              <span>카테고리</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as Expense["category"])}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span>날짜</span>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span>메모 (선택)</span>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} />
            </label>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>취소</button>
              <button type="submit" className="btn primary">저장</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
