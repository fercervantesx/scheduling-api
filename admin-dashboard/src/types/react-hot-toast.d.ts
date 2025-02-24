declare module 'react-hot-toast' {
  export interface Toast {
    id: string;
    type: 'success' | 'error' | 'loading' | 'blank' | 'custom';
    message: string;
    icon?: React.ReactNode;
    duration?: number;
    style?: React.CSSProperties;
  }

  export interface ToasterProps {
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    toastOptions?: {
      duration?: number;
      style?: React.CSSProperties;
      success?: {
        duration?: number;
        style?: React.CSSProperties;
      };
      error?: {
        duration?: number;
        style?: React.CSSProperties;
      };
    };
  }

  export function Toaster(props: ToasterProps): JSX.Element;
  
  export function toast(message: string, options?: any): string;
  export namespace toast {
    function success(message: string, options?: any): string;
    function error(message: string, options?: any): string;
    function loading(message: string, options?: any): string;
    function dismiss(toastId?: string): void;
  }

  export default toast;
} 