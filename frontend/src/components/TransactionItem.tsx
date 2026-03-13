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
        "expense-value-button shrink-0 tap-highlight-none inline-flex items-center justify-end w-auto whitespace-nowrap text-right",
        isStriked && "line-through opacity-70",
        type === "income" ? "text-income" : "text-expense"
      )}
      aria-label={`Editar ${title}`}
    >
      {amountText}
    </button>
  ) : (
    <span
      className={cn(
        "text-subhead font-semibold shrink-0 w-auto whitespace-nowrap text-right",
        isStriked && "line-through opacity-70",
        type === "income" ? "text-income" : "text-expense"
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
      <div className="w-10 h-10 rounded-full bg-secondary/85 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-subhead font-medium text-foreground truncate", isStriked && "line-through opacity-70")}>
          {title}
        </p>
        <p className={cn("text-caption text-muted-foreground", isStriked && "line-through opacity-65")}>
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
