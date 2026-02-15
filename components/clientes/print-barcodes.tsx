'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import Barcode from 'react-barcode';

interface Client {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  matricula?: string | null;
  semestre?: string | null;
  grupo?: string | null;
  turno?: string | null;
  tipo?: string;
}

export function PrintAllBarcodes({ clients }: { clients: Client[] }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    if (!printRef.current) return;
    
    // We get the HTML content from the hidden container
    const content = printRef.current.innerHTML;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Códigos de Barras - Lista Completa</title>
            <style>
              @page {
                size: A4;
                margin: 1cm;
              }
              body { 
                font-family: system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 20px;
                color: #000;
              }
              .grid-container {
                display: grid;
                grid-template-columns: repeat(3, 1fr); 
                gap: 15px;
                width: 100%;
              }
              .student-card {
                border: 1px dashed #ccc;
                padding: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-inside: avoid;
                border-radius: 8px;
                background: white;
              }
              .student-name { 
                font-weight: bold; 
                font-size: 12px; 
                margin-top: 5px;
                text-align: center;
                text-transform: uppercase;
              }
              .student-info { 
                font-size: 10px; 
                color: #444; 
                margin-top: 2px;
                font-family: monospace;
              }
              /* Ensure SVG scales down if needed */
              svg {
                max-width: 100%;
                height: auto;
              }
            </style>
          </head>
          <body>
            <h2 style="text-align: center; margin-bottom: 20px; font-size: 18px;">Listado de Clientes - Códigos de Barras</h2>
            <div class="grid-container">
              ${content}
            </div>
            <script>
              window.onload = () => { window.print(); window.setTimeout(function(){window.close();}, 100); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  return (
    <>
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {clients.map((client) => client.codigoBarras ? (
            <div key={client.id} className="student-card">
              <div className="barcode-wrapper">
                <Barcode 
                  value={client.codigoBarras} 
                  width={1.5} 
                  height={50} 
                  fontSize={14} 
                  displayValue={false} 
                  margin={0}
                />
              </div>
              <div className="student-name">
                {client.nombre}
              </div>
              <div className="student-info">
                {client.matricula ? `Matrícula: ${client.matricula}` : client.tipo} 
                {client.semestre ? ` | Semestre ${client.semestre}` : ''}
                {/* {client.grupo ? ` | Grupo ${client.grupo}` : ''} */}
                | {client.codigoBarras}
              </div>
            </div>
          ) : null)}
        </div>
      </div>
      
      <Button variant="outline" onClick={handlePrint} disabled={clients.length === 0}>
        <Printer className="mr-2 h-4 w-4" />
        Imprimir Códigos
      </Button>
    </>
  );
}
