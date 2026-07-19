import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import { signed } from "@/lib/dashboard";

export function Change({ value, suffix }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span className={positive ? "change-up" : "change-down"}>
      {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {signed(value)} {suffix && <small>{suffix}</small>}
    </span>
  );
}
