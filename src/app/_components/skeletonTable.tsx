import React from 'react';
import styles from '../page.module.css';

interface SkeletonTableProps {
  rows: number;
  columns: number;
}

export default function SkeletonTable({ rows, columns }: SkeletonTableProps) {
  return (
    <div>
      <table>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className={styles.skeletonCell}></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className={styles.skeletonCell}></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
