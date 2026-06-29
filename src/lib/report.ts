import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScanResult } from '@/types';

export function generateReport(r: ScanResult): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  doc.setFontSize(22);
  doc.setTextColor(220, 38, 38);
  doc.text('SPECTER', 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text('Security Intelligence Report', 14, 28);
  doc.setFontSize(9);
  doc.text(`Repository: ${r.repoUrl}`, 14, 38);
  doc.text(`Threat Score: ${r.threatScore}/100`, 14, 45);
  doc.text(`Generated: ${now}`, 14, 52);

  const rows: string[][] = [];

  r.depchain?.nodes.filter((n) => n.cves?.length > 0).forEach((n) => {
    n.cves.forEach((c) =>
      rows.push(['DepChain', c.severity.toUpperCase(), `${n.name}@${n.version}`, c.summary.substring(0, 55)])
    );
  });
  r.ghostcommit?.findings.forEach((f) =>
    rows.push(['GhostCommit', 'CRITICAL', f.type, `${f.file}:${f.line}`])
  );
  r.layerscan?.findings.forEach((f) =>
    rows.push(['LayerScan', f.severity.toUpperCase(), f.issue.substring(0, 35), f.fix.substring(0, 35)])
  );
  r.apibleed?.endpoints.filter((e) => e.issues.length > 0).forEach((e) =>
    rows.push(['APIBleed', e.severity.toUpperCase(), `${e.method} ${e.path}`, e.issues[0]])
  );
  r.envtrace?.findings.forEach((f) =>
    rows.push(['EnvTrace', f.severity.toUpperCase(), f.file, f.detail.substring(0, 55)])
  );

  autoTable(doc, {
    startY: 62,
    head: [['Scanner', 'Severity', 'Finding', 'Detail']],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 1: { fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const sev = data.cell.raw as string;
        if (sev === 'CRITICAL') data.cell.styles.textColor = [220, 38, 38];
        else if (sev === 'HIGH') data.cell.styles.textColor = [234, 88, 12];
        else if (sev === 'MEDIUM') data.cell.styles.textColor = [202, 138, 4];
      }
    },
  });

  doc.save(`specter-report-${Date.now()}.pdf`);
}
