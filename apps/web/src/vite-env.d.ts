/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    'senda-chat': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      'api-key'?: string;
      'space'?: string;
      'title'?: string;
    }, HTMLElement>;
  }
}
