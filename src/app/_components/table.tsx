"use client";
import React, { useState } from 'react';
import styles from '../page.module.css';
import Loader from './loader';

interface TableProps {
  id?: string;
  data: Record<string, any>[];
  paginated?: boolean;
  rowsPerPage?: number;
}

export default function Table({ data, paginated = false, rowsPerPage = 10, id }: TableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPageState, setRowsPerPageState] = useState(rowsPerPage);

  if (data.length === 0) {
    return <Loader />;
  }

  const headers = Object.keys(data[0]);

  const handleClick = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPageState(Number(event.target.value));
    setCurrentPage(1);
  };

  const paginatedData = paginated
    ? data.slice((currentPage - 1) * rowsPerPageState, currentPage * rowsPerPageState)
    : data;

  const totalPages = Math.ceil(data.length / rowsPerPageState);

  // const renderPagination = () => {
  //   const pages = [];
  //   if (totalPages <= 5) {
  //     for (let i = 1; i <= totalPages; i++) {
  //       pages.push(i);
  //     }
  //   } else {
  //     if (currentPage <= 3) {
  //       pages.push(1, 2, 3, 4, '...', totalPages);
  //     } else if (currentPage >= totalPages - 2) {
  //       pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  //     } else {
  //       pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
  //     }
  //   }
  //   return (
  //     <div className={styles.pagination} data-testid={testId}>
  //       {pages.map((page, index) =>
  //         typeof page === 'number' ? (
  //           <button
  //             key={index}
  //             onClick={() => handleClick(page)}
  //             className={page === currentPage ? styles.active : ""}
  //           >
  //             {page}
  //           </button>
  //         ) : (
  //           <span key={index}>...</span>
  //         )
  //       )}
  //     </div>
  //   );
  // }

  const renderPagination = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return (
      <div className={styles.pagination}>
        <div className={styles.pageButtons}>
          {pages.map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => handleClick(page)}
                className={page === currentPage ? styles.active : ""}
              >
                {page}
              </button>
            ) : (
              <span key={index}>...</span>
            )
          )}
        </div>
        <div className={styles.rowsPerPage}>
          <label htmlFor="rowsPerPage">Rows per page:</label>
          <select id="rowsPerPage" value={rowsPerPageState} onChange={handleRowsPerPageChange}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.table}>
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, index) => (
            <tr key={index}>
              {headers.map((header, index) => (
                <td 
                  key={header} 
                  className={(typeof row[header]   === 'number' && index != 0) ? `${styles.numberCell}`: `${styles.textCell}`}
                >
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {paginated && renderPagination()}
    </div>
  );
}