import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScanResult } from '@/types';

export function generateReport(r: ScanResult): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(239, 68, 68); // Tailwind red-500
  doc.text('SPECTER', 14, 20);
  
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text('Security Intelligence Report', 14, 28);
  
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(`Repository: ${r.repoUrl}`, 14, 38);
  doc.text(`Threat Score: ${r.threatScore}/100`, 14, 43);
  doc.text(`Generated:  ${now}`, 14, 48);

  const rows: string[][] = [];

  r.depchain?.nodes.filter((n) => (n.cves?.length ?? 0) > 0).forEach((n) => {
    n.cves.forEach((c) =>
      rows.push(['DepChain', c.severity.toUpperCase(), `${n.name}@${n.version}`, c.summary.substring(0, 65) + '...'])
    );
  });
  r.ghostcommit?.findings.forEach((f) =>
    rows.push(['GhostCommit', 'CRITICAL', f.type, `${f.file}:${f.line}`])
  );
  r.layerscan?.findings.forEach((f) =>
    rows.push(['LayerScan', f.severity.toUpperCase(), f.issue.substring(0, 40), f.fix.substring(0, 45) + '...'])
  );
  r.apibleed?.endpoints.filter((e) => e.issues.length > 0).forEach((e) =>
    rows.push(['APIBleed', e.severity.toUpperCase(), `${e.method} ${e.path}`, e.issues[0]])
  );
  r.envtrace?.findings.forEach((f) =>
    rows.push(['EnvTrace', f.severity.toUpperCase(), f.file, f.detail.substring(0, 65) + '...'])
  );

  // Core Data Table
  autoTable(doc, {
    startY: 55,
    head: [['Scanner', 'Severity', 'Finding', 'Detail']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 20, 30], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 
      0: { cellWidth: 24 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 55 },
      3: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const sev = data.cell.raw as string;
        if (sev === 'CRITICAL') data.cell.styles.textColor = [239, 68, 68];
        else if (sev === 'HIGH') data.cell.styles.textColor = [249, 115, 22];
        else if (sev === 'MEDIUM') data.cell.styles.textColor = [234, 179, 8];
      }
    },
  });

  // Inject AI Intelligence Brief if available
  let finalY = (doc as any).lastAutoTable.finalY + 15;

  if (r.aiExplanation) {
    // Check if we need a page break before starting the AI section
    if (finalY > 230) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68);
    doc.text('▶ AI INTELLIGENCE BRIEF', 14, finalY);

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const splitBrief = doc.splitTextToSize(r.aiExplanation.summary, 180);
    doc.text(splitBrief, 14, finalY + 8);
    
    finalY += 12 + (splitBrief.length * 4);

    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text('Key Recommendations:', 14, finalY);
    finalY += 8;

    r.aiExplanation.items.slice(0, 3).forEach((item, i) => {
      // Page break check for each item
      if (finalY > 270) { 
        doc.addPage(); 
        finalY = 20; 
      }
      
      doc.setFontSize(9);
      doc.setTextColor(239, 68, 68);
      doc.text(`${i + 1}. ${item.title}`, 14, finalY);
      
      doc.setTextColor(80, 80, 80);
      const fixText = doc.splitTextToSize(`Fix: ${item.exact_fix}`, 175);
      doc.text(fixText, 14, finalY + 5);
      
      finalY += 8 + (fixText.length * 4);
    });
  }

  // Generate and save
  const cleanRepoName = r.repoUrl.split('/').pop() || 'Scan';
  doc.save(`Specter_Report_${cleanRepoName}_${Date.now()}.pdf`);
}