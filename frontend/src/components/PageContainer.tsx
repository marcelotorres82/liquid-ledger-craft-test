import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, LogOut, MoonStar, SunMedium } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMonthName, getShortMonthName } from '@/lib/format';
import { useFinanceStore } from '@/store/financeStore';
import { useUIStore } from '@/store/uiStore';
import { setSheetOpenState } from '@/lib/sheetState';
import { LiquidGlass } from './LiquidGlass';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  titleNode?: React.ReactNode;
  subtitle?: string;
  className?: string;
  onLogout: () => void;
  centerHeading?: boolean;
}

const PageContainer = ({
  children,
  title,
  titleNode,
  subtitle,
  className,
  onLogout,
  centerHeading = false,
}: PageContainerProps) => {
  const currentMonth = useFinanceStore((state) => state.currentMonth);
  const currentYear = useFinanceStore((state) => state.currentYear);
  const setPeriod = useFinanceStore((state) => state.setPeriod);
  const changeMonth = useFinanceStore((state) => state.changeMonth);
  const isLoadingData = useFinanceStore((state) => state.isLoadingData);
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentYear);

  useEffect(() => {
    if (!monthPickerOpen) return;
    setPickerYear(currentYear);
  }, [monthPickerOpen, currentYear]);

  useEffect(() => {
    if (!monthPickerOpen) return;
    setSheetOpenState(true);
    return () => {
      setSheetOpenState(false);
    };
  }, [monthPickerOpen]);

  const handleSelectMonth = async (month: number) => {
    await setPeriod(month, pickerYear);
    setMonthPickerOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('min-h-screen pb-32 px-4 pt-8 max-w-lg mx-auto', className)}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-5"
      >
        <div
          className={cn(
            'mb-4 gap-3',
            centerHeading
              ? 'grid grid-cols-[94px_1fr_auto] items-center'
              : 'flex items-start justify-between'
          )}
        >
          {centerHeading && <div aria-hidden className="w-[94px] h-1" />}

          <div className={cn(centerHeading && 'text-center')}>
            {titleNode ?? (title ? <h1 className="text-large-title text-foreground">{title}</h1> : null)}
            {subtitle && <p className="text-subhead text-muted-foreground mt-1">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2 justify-self-end">
            <LiquidGlass
              variant="sm"
              onClick={toggleTheme}
              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              {theme === 'dark' ? <SunMedium className="w-5 h-5" /> : <MoonStar className="w-5 h-5" />}
            </LiquidGlass>

            <LiquidGlass
              variant="sm"
              onClick={onLogout}
              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </LiquidGlass>
          </div>
        </div>

        <LiquidGlass variant="sm" className="p-1 flex items-center justify-between gap-1.5 oppo-card border-none bg-secondary/20">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            disabled={isLoadingData}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground tap-highlight-none transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setMonthPickerOpen(true)}
            className="flex-1 rounded-2xl px-3 py-2 bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-0.5 tap-highlight-none hover:bg-white/10 transition-colors"
            aria-label="Selecionar mês"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-caption font-bold text-foreground leading-tight tracking-wide">
                {getMonthName(currentMonth).toUpperCase()} {currentYear}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={isLoadingData}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground tap-highlight-none transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </LiquidGlass>
      </motion.div>

      {children}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {monthPickerOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Fechar seletor de mês"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMonthPickerOpen(false)}
                  className="fixed inset-0 bg-foreground/18 backdrop-blur-sm z-50"
                />

                <motion.div
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] mx-auto max-w-lg z-[60]"
                >
                  <LiquidGlass className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => setPickerYear((year) => year - 1)}
                        className="w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center text-muted-foreground tap-highlight-none"
                        aria-label="Ano anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <p className="text-headline text-foreground">{pickerYear}</p>

                      <button
                        type="button"
                        onClick={() => setPickerYear((year) => year + 1)}
                        className="w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center text-muted-foreground tap-highlight-none"
                        aria-label="Próximo ano"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }, (_, index) => {
                        const month = index + 1;
                        const active = month === currentMonth && pickerYear === currentYear;

                        return (
                          <button
                            type="button"
                            key={`month-${month}`}
                            disabled={isLoadingData}
                            onClick={() => handleSelectMonth(month)}
                            className={cn(
                              'rounded-2xl px-3 py-2.5 text-subhead tap-highlight-none transition-all',
                              active
                                ? 'bg-foreground text-background font-semibold'
                                : 'bg-secondary/60 text-foreground hover:bg-secondary'
                            )}
                          >
                            {getShortMonthName(month)}
                          </button>
                        );
                      })}
                    </div>
                  </LiquidGlass>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.div>
  );
};

export default PageContainer;
