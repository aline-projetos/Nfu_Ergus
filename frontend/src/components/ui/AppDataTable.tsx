import React, { CSSProperties, ReactNode } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

export interface TableColumn {
  field?: string;
  header: string;
  body?: (rowData: any) => ReactNode;
  sortable?: boolean;
  style?: CSSProperties;
  headerStyle?: CSSProperties;
  className?: string;
}

interface AppDataTableProps {
  title: string;
  icon: ReactNode;
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  emptyMessage?: string;
  selection?: any[];
  onSelectionChange?: (selected: any[]) => void;
  toolbar?: ReactNode;
  headerExtra?: ReactNode;
  dataKey?: string;
  rows?: number;
}

export function AppDataTable({
  title,
  icon,
  data,
  columns,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  selection,
  onSelectionChange,
  toolbar,
  headerExtra,
  dataKey = 'id',
  rows = 10,
}: AppDataTableProps) {
  return (
    <div className="card-dashboard">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>
        {toolbar && <div>{toolbar}</div>}
      </div>

      {headerExtra && (
        <div className="px-6 py-3 border-b border-border">
          {headerExtra}
        </div>
      )}

      <DataTable
        value={data}
        dataKey={dataKey}
        loading={loading}
        emptyMessage={emptyMessage}
        paginator
        rows={rows}
        rowsPerPageOptions={[5, 10, 25, 50]}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        currentPageReportTemplate="{first}-{last} de {totalRecords}"
        removableSort
        sortMode="single"
        selection={selection}
        onSelectionChange={
          onSelectionChange ? (e) => onSelectionChange(e.value) : undefined
        }
        tableStyle={{ minWidth: '40rem' }}
      >
        {selection !== undefined && onSelectionChange && (
          <Column
            selectionMode="multiple"
            headerStyle={{ width: '3rem' }}
            style={{ width: '3rem' }}
          />
        )}
        {columns.map((col, idx) => (
          <Column
            key={col.field ?? `col-${idx}`}
            field={col.field}
            header={col.header}
            body={col.body}
            sortable={col.sortable}
            style={col.style}
            headerStyle={col.headerStyle}
            className={col.className}
          />
        ))}
      </DataTable>
    </div>
  );
}
