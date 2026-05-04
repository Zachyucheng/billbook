import { BillbookState, ExportFormat } from "@/lib/types";

type BackupEnvelope = {
  version: number;
  exportedAt: string;
  mode: "local-backup";
  state: BillbookState;
};

export function downloadWorkspaceExport(
  state: BillbookState,
  format: ExportFormat,
) {
  const dateSuffix = new Date().toISOString().slice(0, 10);

  if (format === "excel") {
    downloadBlob(
      new Blob([buildExcelWorkbook(state)], {
        type: "application/vnd.ms-excel;charset=utf-8",
      }),
      `billbook-export-${dateSuffix}.xls`,
    );
    return;
  }

  const payload =
    format === "json"
      ? JSON.stringify(state, null, 2)
      : buildTransactionsCsv(state);
  const mimeType = format === "json" ? "application/json" : "text/csv;charset=utf-8";

  downloadBlob(
    new Blob([payload], { type: mimeType }),
    `billbook-export-${dateSuffix}.${format}`,
  );
}

export function downloadWorkspaceBackup(state: BillbookState) {
  const payload: BackupEnvelope = {
    version: 1,
    exportedAt: new Date().toISOString(),
    mode: "local-backup",
    state,
  };

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    }),
    `billbook-backup-${payload.exportedAt.slice(0, 10)}.json`,
  );

  return payload.exportedAt;
}

function buildTransactionsCsv(state: BillbookState) {
  const header = [
    "date",
    "title",
    "kind",
    "amount",
    "category",
    "account",
    "objects",
    "note",
  ];

  const rows = state.transactions.map((transaction) => {
    const categoryName =
      state.categories.find((category) => category.id === transaction.categoryId)?.name ??
      transaction.categoryId;
    const accountName =
      state.accounts.find((account) => account.id === transaction.accountId)?.name ??
      transaction.accountId;
    const objectNames = transaction.allocations
      .map(
        (allocation) =>
          state.objects.find((ledgerObject) => ledgerObject.id === allocation.objectId)?.name ??
          allocation.objectId,
      )
      .join(" / ");

    return [
      transaction.date,
      transaction.title,
      transaction.kind,
      transaction.amount.toFixed(2),
      categoryName,
      accountName,
      objectNames,
      transaction.note,
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(","))
    .join("\n");
}

function buildExcelWorkbook(state: BillbookState) {
  const transactionRows = state.transactions.map((transaction) => {
    const categoryName =
      state.categories.find((category) => category.id === transaction.categoryId)?.name ??
      transaction.categoryId;
    const accountName =
      state.accounts.find((account) => account.id === transaction.accountId)?.name ??
      transaction.accountId;
    const objectNames = transaction.allocations
      .map(
        (allocation) =>
          state.objects.find((ledgerObject) => ledgerObject.id === allocation.objectId)?.name ??
          allocation.objectId,
      )
      .join(" / ");

    return [
      transaction.date,
      transaction.title,
      transaction.kind,
      transaction.amount.toFixed(2),
      categoryName,
      accountName,
      objectNames,
      transaction.note,
    ];
  });

  const objectRows = state.objects.map((ledgerObject) => [
    ledgerObject.name,
    ledgerObject.kind,
    state.categories
      .filter((category) => ledgerObject.categoryIds.includes(category.id))
      .map((category) => category.name)
      .join(" / "),
    ledgerObject.note,
  ]);

  const worksheets = [
    {
      name: "交易记录",
      rows: [
        ["日期", "标题", "类型", "金额", "分类", "账户", "对象", "备注"],
        ...transactionRows,
      ],
    },
    {
      name: "对象列表",
      rows: [["名称", "类型", "可用分类", "备注"], ...objectRows],
    },
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${worksheets
    .map(
      (sheet) => `<Worksheet ss:Name="${escapeXml(sheet.name)}">
    <Table>
      ${sheet.rows
        .map(
          (row) => `<Row>
        ${row
          .map(
            (cell) => `<Cell><Data ss:Type="String">${escapeXml(String(cell ?? ""))}</Data></Cell>`,
          )
          .join("")}
      </Row>`,
        )
        .join("")}
    </Table>
  </Worksheet>`,
    )
    .join("")}
</Workbook>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
