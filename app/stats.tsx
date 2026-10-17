"use client";

import { useState } from "react";
import { CATEGORIES, Expense, todayStr, won } from "../lib/format";

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Bar({ label, amount, max, note }: { label: string; amount: number; max: number; note?: string }) {
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${max ? (amount / max) * 100 : 0}%` }} />
      </div>
      <span className="bar-amount">
        {won(amount)}
        {note && <em>{note}</em>}
      </span>
    </div>
  );
}

export default function Stats({ expenses }: { expenses: Expense[] }) {
  const [ym, setYm] = useState(todayStr().slice(0, 7));
  const list = expenses.filter((e) => e.date.startsWith(ym));
  const total = list.reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map((c) => ({
    name: c,
    amount: list.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const dayTotals = list.reduce<Record<string, number>>((acc, e) => {
    acc[e.date] = (acc[e.date] ?? 0) + e.amount;
    return acc;
  }, {});
  const byDay = Object.entries(dayTotals).sort(([a], [b]) => a.localeCompare(b));
  const maxDay = Math.max(0, ...byDay.map(([, v]) => v));

  return (
    <>
      <div className="month-nav">
        <button aria-label="이전 달" onClick={() => setYm(shiftMonth(ym, -1))}>‹</button>
        <span>{ym.slice(0, 4)}년 {Number(ym.slice(5))}월</span>
        <button aria-label="다음 달" onClick={() => setYm(shiftMonth(ym, 1))}>›</button>
      </div>
      <h1 className="total">{won(total)}</h1>

      {list.length === 0 ? (
        <p className="empty">이 달의 지출 내역이 없어요</p>
      ) : (
        <>
          <h2 className="section-title">항목별</h2>
          {byCategory.map((c) => (
            <Bar key={c.name} label={c.name} amount={c.amount} max={byCategory[0].amount} note={`${Math.round((c.amount / total) * 100)}%`} />
          ))}

          <h2 className="section-title">일자별</h2>
          {byDay.map(([d, v]) => (
            <Bar key={d} label={`${Number(d.slice(8))}일`} amount={v} max={maxDay} />
          ))}
        </>
      )}
    </>
  );
}
