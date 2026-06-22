import React from "react";
import { reportError } from "@/lib/reportError";

/**
 * Captura erros de renderização para não deixar a tela branca ("white screen of death").
 * Mostra uma mensagem amigável + opção de recarregar, e reporta o erro.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center border border-border rounded-2xl p-8 bg-card">
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="font-display text-xl font-bold mb-2">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Tivemos um problema ao carregar esta tela. O erro foi registrado. Recarregue para tentar de novo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold px-5 py-2.5 rounded-lg"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
