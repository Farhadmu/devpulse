import pool from '../config/db';
import { QueryResult, QueryResultRow } from 'pg';

/**
 * Execute a raw SQL query using the pool
 */
export const query = async <T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
