import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  amount: number;
  type: "income" | "expense";
  delay?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onAmountClick?: () => void;
  isStriked?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
  checkLabel?: string;
  isCheckDisabled?: boolean;
}

const TransactionItem = ({
  icon,
  title,
  subtitle,
  amount,
  type,
  delay = 0,
  onEdit,
  onDelete,
  onAmountClick,
  isStriked = false,
  isChecked = false,
  onToggleCheck,
  checkLabel = "Marcar",
  isCheckDisabled = false,
}: TransactionItemProps) => {
  const [showActions, setShowActions] = useState(false);
  const hasActions = Boolean(onEdit || onDelete);
  const amountText = `${type === "income" ? "+" : "-"} R$ ${Math.abs(amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const amountNode = onAmountClick ? (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onAmountClick();
      }}
      className={cn(
        "expense-value-button shrink-0 tap-highlight-none inline-flex items-center justify-end w-auto whitespace-nowrap text-right font-black",
        isStriked && "line-through opacity-70",
        type === "income" ? "text-income drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]" : "text-expense drop-shadow-[0_2px_8px_rgba(239,68,68,0.3)]"
      )}
      aria-label={`Editar ${title}`}
    >
      {amountText}
    </button>
  ) : (
    <span
      className={cn(
        "text-subhead font-black shrink-0 w-auto whitespace-nowrap text-right",
        isStriked && "line-through opacity-70",
        type === "income" ? "text-income drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "text-expense drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"
      )}
    >
      {amountText}
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      layout
      className={cn("flex items-center gap-3 py-3", hasActions && "cursor-pointer")}
      onClick={hasActions ? () => setShowActions((v) => !v) : undefined}
    >
      <div className="w-11 h-11 rounded-2xl liquid-glass-sm border border-white/5 flex items-center justify-center text-muted-foreground/80 shrink-0 shadow-sm">
        <div className="scale-110 drop-shadow-md">{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-subhead font-bold text-foreground truncate tracking-tight", isStriked && "line-through opacity-70")}>
          {title}
        </p>
        <p className={cn("text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest", isStriked && "line-through opacity-65")}>
          {subtitle}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0 min-w-0">
        {hasActions ? (
          <AnimatePresence>
            {showActions ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1 shrink-0 overflow-hidden"
              >
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center tap-highlight-none active:scale-90 transition-transform"
                  >
                    <Pencil className="w-3.5 h-3.5 text-primary" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center tap-highlight-none active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                )}
              </motion.div>
            ) : (
              amountNode
            )}
          </AnimatePresence>
        ) : (
          amountNode
        )}

        {onToggleCheck && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCheck();
            }}
            disabled={isCheckDisabled}
            className={cn(
              "payment-switch tap-highlight-none active:scale-95",
              isChecked ? "payment-switch-on" : "payment-switch-off",
              isCheckDisabled && "opacity-65 cursor-not-allowed"
            )}
            aria-label={checkLabel}
            title={checkLabel}
          >
            <span className="payment-switch-knob" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default TransactionItem;
