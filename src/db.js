/**
 * db.js  - PostgreSQL database setup
 * 
 * Use a connection pool(pg.Pool) - handle multiple concurrent
 * span ingestion without blocking
 * 
 * Schema:
 * traces — one row per trace (summary metadata)
 * spans  — one row per span, foreign key to traces
 * Call db.init() once at startup before anything else.
 */

import pg from "pg"
import 'dotenv/config'

const { Pool } = pg

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL ?? 'postgresql://otellocal:otellocal@localhost:5432/otellocal',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_000,
})

pool.on('error',(err) =>{
    console.error('[db] pool error:', err.message)
})


const SCHEMA = `
 CREATE TABLE IF NOT EXISTS traces (
    trace_id  text  primary key,
    root_name  text not null default '',
    service    text  not null default 'unknown',
    start_ms    BIGINT      NOT NULL,
    end_ms      BIGINT      NOT NULL,
    has_error   BOOLEAN     NOT NULL DEFAULT false,
    span_count  INTEGER     NOT NULL DEFAULT 0,
    created_at  BIGINT      NOT NULL
 )


 CREATE TABLE IF NOT EXISTS spans(
    span_id  text  primary key,
    trace_id  text not null references traces(trace_id) on delete cascade,
    parent_span_id TEXT,
    name           TEXT    NOT NULL,
    service        TEXT    NOT NULL DEFAULT 'unknown',
    start_ms       BIGINT  NOT NULL,
    end_ms         BIGINT  NOT NULL,
    duration_ms    BIGINT  NOT NULL,
    status_code    INTEGER NOT NULL DEFAULT 0,
    kind           INTEGER NOT NULL DEFAULT 0,
    attributes     JSONB   NOT NULL DEFAULT '{}',
    created_at     BIGINT  NOT NULL

 )

 CREATE INDEX IF NOT EXISTS idx_traces_start_ms  ON traces(start_ms DESC);
 CREATE INDEX IF NOT EXISTS idx_traces_created   ON traces(created_at DESC);
 CREATE INDEX IF NOT EXISTS idx_spans_trace_id   ON spans(trace_id);
 CREATE INDEX IF NOT EXISTS idx_spans_attributes ON spans USING GIN(attributes);


`


export async function init(){
    const client = await pool.connect();
    try{
        await client.query(SCHEMA);
        console.log('[db] schema ready')
    }finally{
        client.release()
    }
}


export async function transaction(fn){
    const client = await pool.connect();
    try{
        await client.query('BEGIN');
        const result = await fn(client)
        await client.query('COMMIT')
        return result
    }catch(err){
        await client.query('ROLLBACK')
        throw err
    }finally{
        client.release()
    }
}

export async function query(sql,params = []){
    await pool.query(sql,params)
}


export default pool;