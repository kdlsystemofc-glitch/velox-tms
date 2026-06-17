import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

const ICONS = {
  default:     { Icon: CheckCircle2, cls: "text-emerald-500" },
  success:     { Icon: CheckCircle2, cls: "text-emerald-500" },
  destructive: { Icon: AlertCircle,  cls: "text-red-500" },
  info:        { Icon: Info,         cls: "text-sky-500" },
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      <ToastViewport>
        {toasts.map(function ({ id, title, description, action, open, variant, ...props }) {
          if (!open) return null;
          const { Icon, cls } = ICONS[variant] || ICONS.default;
          return (
            <Toast key={id} open={open} variant={variant} {...props}>
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cls}`} />
              <div className="grid gap-0.5 flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose onClick={() => dismiss(id)} />
            </Toast>
          );
        })}
      </ToastViewport>
    </ToastProvider>
  );
}