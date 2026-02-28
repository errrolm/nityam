import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportPDF = (result: any, mode: string) => {
  if (!result) return;

  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [13, 148, 136];

  doc.setFontSize(22);
  doc.setTextColor(24, 24, 27);
  doc.text("Nityam Policy Analysis", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()} | View: ${mode.toUpperCase()}`,
    14,
    28,
  );

  if (mode === "compile_rules") {
    // Validation Mode Layout
    autoTable(doc, {
      startY: 35,
      head: [["Entities"]],
      body: [["Variables extracted for deterministic execution."]],
      theme: "grid",
      headStyles: { fillColor: primaryColor, fontSize: 12 },
    });

    if (result.entities) {
      const entityBody = Object.entries(result.entities).map(([key, type]) => [
        key,
        String(type),
      ]);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Entity Name", "Data Type"]],
        body: entityBody,
        theme: "striped",
        headStyles: { fillColor: [82, 82, 91] },
      });
    }

    if (result.states && result.states.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Workflow States"]],
        body: [[result.states.join("  →  ")]],
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    if (result.rules && result.rules.length > 0) {
      const ruleBody = result.rules.map((rule: any) => [
        rule.id,
        rule.fact,
        rule.operator,
        String(rule.value),
        rule.onSuccess,
        rule.onFailure,
      ]);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Rule ID", "Entity", "Operator", "Value", "On Success", "On Failure"]],
        body: ruleBody,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 8 },
      });
    }

  } else {
    // Standard Analysis Layout (Officer / Citizen)
    autoTable(doc, {
      startY: 35,
      head: [["Executive Summary"]],
      body: [[(result.summary || "No summary provided.").replace(/\*\*/g, "")]],
      theme: "grid",
      headStyles: { fillColor: primaryColor, fontSize: 12 },
      styles: { fontSize: 10, cellPadding: 5, textColor: [39, 39, 42] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Risk Level", "Complexity Score"]],
      body: [
        [
          result.risk_level?.toUpperCase() || "N/A",
          `${result.complexity_score || 0} / 10`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [82, 82, 91] },
      styles: { fontStyle: "bold", halign: "center" },
    });

    if (mode === "officer" && result.metrics) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [
          [
            "Est. Processing Time",
            "Manpower Requirement",
            "Department Load",
            "Risk Exposure",
          ],
        ],
        body: [
          [
            result.metrics.estimated_processing_time,
            result.metrics.manpower_level,
            result.metrics.department_load,
            `${result.metrics.risk_exposure_percent}%`,
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [82, 82, 91] },
        styles: { halign: "center" },
      });
    }

    const items = mode === "officer" ? result.workflow : result.instructions;
    if (items && items.length > 0) {
      const wHead =
        mode === "officer"
          ? [["#", "Action Step", "Source Clause"]]
          : [["#", "Instruction Step"]];
      const wBody = items.map((item: any, idx: number) => {
        if (mode === "officer") {
          return [
            (idx + 1).toString(),
            item.step.replace(/\*\*/g, ""),
            item.clause || "N/A",
          ];
        }
        const text = typeof item === "string" ? item : item.step;
        return [(idx + 1).toString(), text.replace(/\*\*/g, "")];
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: wHead,
        body: wBody,
        theme: "striped",
        headStyles: { fillColor: primaryColor },
        columnStyles: {
          0: { cellWidth: 15, halign: "center", fontStyle: "bold" },
          2: { cellWidth: 35, textColor: [113, 113, 122], fontSize: 9 },
        },
      });
    }

    if (mode === "officer") {
      const drawListTable = (
        title: string,
        data: any[],
        color: [number, number, number],
      ) => {
        if (!data || data.length === 0) return;
        let body: any[] = [];
        if (typeof data[0] === "string") {
          body = data.map((str) => [str.replace(/\*\*/g, "")]);
        } else if (title === "Ambiguities") {
          body = data.map((item) => [
            `Term: "${item.term}"\nIssue: ${item.issue}`,
          ]);
        }
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [[title]],
          body: body,
          theme: "grid",
          headStyles: { fillColor: color },
        });
      };

      if (result.slas && result.slas.length > 0) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [["Timeframe", "SLA Action Required"]],
          body: result.slas.map((sla: any) => [
            sla.timeframe,
            sla.action.replace(/\*\*/g, ""),
          ]),
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
        });
      }

      drawListTable("Decision Points", result.decision_points, [99, 102, 241]);
      drawListTable("Identified Risks", result.risks, [244, 63, 94]);
      drawListTable("Ambiguities", result.ambiguities, [245, 158, 11]);
      drawListTable("Compliance Gaps", result.compliance_gaps, [249, 115, 22]);
    }
  }

  doc.save("Nityam-Policy-Report.pdf");
};