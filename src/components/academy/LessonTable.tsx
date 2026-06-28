import type { ReactNode } from "react";

interface Column {
  header: string;
  key: string;
  className?: string;
}

interface LessonTableProps {
  columns: Column[];
  rows: Record<string, ReactNode>[];
  caption?: string;
}

export function LessonTable({ columns, rows, caption }: LessonTableProps) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-border/40">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row, i) => (
              <tr key={i} className="bg-card/30 hover:bg-primary/5 transition-colors duration-150">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-muted-foreground ${col.className || ""}`}>
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <div className="border-t border-border/40 bg-card/20 px-4 py-2 text-xs text-muted-foreground">
          {caption}
        </div>
      )}
    </div>
  );
}
