import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import { signed } from "@/lib/dashboard";

export function Change({ value, suffix }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 whitespace-nowrap text-[9px] ${positive ? "text-[#3f7656]" : "text-[#994a45]"}`}
    >
      {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {signed(value)}{" "}
      {suffix && (
        <small className="ml-0.5 text-[8px] font-normal text-[#999c96]">
          {suffix}
        </small>
      )}
    </span>
  );
}
