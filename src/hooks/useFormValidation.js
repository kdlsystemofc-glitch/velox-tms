import { useState } from "react";

export function useFormValidation() {
  const [errors, setErrors] = useState({});

  const validate = (rules) => {
    const newErrors = {};
    Object.entries(rules).forEach(([field, { value, message, condition }]) => {
      if (condition !== undefined ? condition : !value || (typeof value === "string" && value.trim() === "")) {
        newErrors[field] = message;
      }
    });
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      setTimeout(() => {
        const firstErrorEl = document.querySelector("[data-error='true']");
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return false;
    }
    return true;
  };

  const clearError = (field) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearAll = () => setErrors({});

  return { errors, validate, clearError, clearAll };
}