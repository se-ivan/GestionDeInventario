declare module 'react-barcode' {
    import React from 'react';
  
    interface BarcodeProps {
      value: string;
      renderer?: 'svg' | 'canvas' | 'img';
      format?: 'CODE128' | 'CODE128A' | 'CODE128B' | 'CODE128C' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14' | 'ITF' | 'MSI' | 'MSI10' | 'MSI11' | 'MSI1010' | 'MSI1110' | 'pharmacode';
      width?: number;
      height?: number;
      displayValue?: boolean;
      text?: string;
      fontOptions?: string;
      font?: string;
      textAlign?: string;
      textPosition?: string;
      textMargin?: number;
      fontSize?: number;
      background?: string;
      lineColor?: string;
      margin?: number;
      marginTop?: number;
      marginBottom?: number;
      marginLeft?: number;
      marginRight?: number;
      className?: string;
    }
  
    const Barcode: React.FC<BarcodeProps>;
    export default Barcode;
  }
