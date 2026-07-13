import type { TableHTMLAttributes, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({
  children,
  className = "",
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
      <table
        className={`w-full border-collapse text-left text-body-sm text-on-surface ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`bg-surface-container-low border-b border-outline-variant/30 text-label-md font-bold text-on-surface-variant ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={`divide-y divide-outline-variant/10 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`hover:bg-surface-container-lowest/60 transition-colors ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-6 py-4 whitespace-nowrap align-middle text-body-sm text-on-surface-variant ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableHead({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-6 py-3 font-semibold text-label-md text-on-surface-variant ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}
